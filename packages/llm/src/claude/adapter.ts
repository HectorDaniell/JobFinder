/**
 * CLAUDE ADAPTER — el "enchufe" que implementa el puerto LlmPort del core.
 *
 * Aquí se cierra el círculo hexagonal: el core definió el contrato (LlmPort)
 * y esta clase lo CUMPLE usando Claude. No hace trabajo de bajo nivel;
 * ORQUESTA las piezas que ya construimos:
 *
 *   prompt-loader  → arma el prompt
 *   ClaudeClient   → habla con Claude (retry/timeout/costo)
 *   guardrails     → valida estructura + anti-invención
 *   types (core)   → mapea la salida al contrato TailoredCv
 *
 * `implements LlmPort` obliga a que esta clase tenga los 4 métodos del puerto.
 * tailorCv está completo; los otros 3 son stubs (siguientes pasos / fases),
 * pero DEBEN existir para que el contrato compile.
 */

import type {
  LlmPort,
  TailoredCv,
  TailoredBullet,
  Job,
  Profile,
  Bullet,
  JobScore,
  ExtractedJob,
} from '@jobfinder/core';
import { ClaudeClient } from './client';
import { loadPromptFile, fillTailorCvPrompt, fillTailorCoverLetterPrompt } from './prompt-loader';
import {
  ClaudeTailorCvResponseSchema,
  TailorCoverLetterSchema,
  BulletOriginValidator,
} from './guardrails';
import {
  GuardrailViolationError,
  MalformedLlmResponseError,
  ProfileHasNoBulletsError,
} from './errors';
import type { ClaudeTailorCvResponse, BulletMatch } from './types';

/**
 * Puerto definido por el consumidor: lo que el adapter necesita del exterior
 * para conseguir los bullets de un perfil.
 *
 * BulletRepository (packages/db) cumple esta forma por TIPADO ESTRUCTURAL,
 * así que llm NO importa db. El cableado (Sprint 4) hace: new ClaudeAdapter(client, bulletRepo).
 */
export interface BulletProvider {
  findByProfileId(profileId: string): Promise<Bullet[]>;
}

export class ClaudeAdapter implements LlmPort {
  constructor(
    private readonly client: ClaudeClient,
    private readonly bullets: BulletProvider
  ) {}

  /**
   * Adapta el CV a una vacante: selecciona y reformula bullets REALES del banco.
   * Flujo: banco → prompt → motor → parseo → anti-invención → mapeo al contrato.
   */
  async tailorCv(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<TailoredCv> {
    // 1. Conseguir el banco de bullets (vía el puerto del consumidor)
    const bank = await this.bullets.findByProfileId(profile.id);
    if (bank.length === 0) {
      throw new ProfileHasNoBulletsError(profile.id);
    }

    // 2. Construir el prompt (plantilla .txt + datos reales)
    const template = loadPromptFile('tailor-cv.txt');
    const { system, user } = fillTailorCvPrompt(template, { job, profile, bullets: bank, lang });

    // 3. Llamar al motor (retry / timeout / costo ya resueltos ahí)
    const { text } = await this.client.complete({
      system,
      user,
      operation: 'tailorCv',
      temperature: 0.3, // determinístico: queremos la MEJOR selección, no variedad
      maxTokens: 1024,
    });

    // 4. Parsear + validar estructura (guardrail de salida)
    const parsed = this.parseTailorCvResponse(text);

    // 5. Anti-invención: cada bullet debe provenir del banco real. La misma
    //    pasada YA resolvió a qué bullet original hizo match cada uno.
    const check = BulletOriginValidator.validate(parsed.selected_bullets, bank, lang);

    // Degradación con gracia: un bullet inventado no tumba el CV entero.
    // Se descarta SOLO ese (queda fuera de validMatches) y seguimos con los
    // que sí vienen del banco real. Solo si Claude falló en TODOS no queda
    // nada legítimo que ofrecer, y ahí sí es un error.
    const validMatches = check.matches.filter(
      (m): m is BulletMatch & { matchedBullet: Bullet } => m.matchedBullet !== undefined
    );
    if (validMatches.length === 0) {
      throw new GuardrailViolationError(check.issues);
    }
    if (check.issues.length > 0) {
      console.warn(
        `tailorCv: ${check.issues.length} bullet(s) inventado(s) descartado(s) — ${check.issues.join('; ')}`
      );
    }

    // 6. Mapear respuesta cruda → contrato del core (TailoredCv). Todo salvo el
    //    texto sale del bullet ORIGINAL emparejado, nunca de Claude: documents
    //    lo usa para agrupar el CV por empresa y por contexto (Paso 1d).
    const bullets: TailoredBullet[] = validMatches.map((m) => ({
      text: m.text,
      category: m.matchedBullet.category,
      experienceId: m.matchedBullet.experienceId,
      sourceRole: m.matchedBullet.sourceRole,
      skills: m.matchedBullet.skills,
    }));

    return {
      content: bullets.map((b) => `• ${b.text}`).join('\n'),
      bullets,
      keywords: parsed.keywords,
    };
  }

  /* ─── Pendientes (siguientes pasos), pero deben existir para cumplir LlmPort ─── */

  /**
   * Genera una carta de presentación personalizada para la vacante.
   * A diferencia de tailorCv: salida de TEXTO LIBRE, más creativa (temp 0.7),
   * y sin guardrail de anti-invención (la carta frasea libremente).
   */
  async tailorCoverLetter(job: Job, profile: Profile, lang: 'es' | 'en'): Promise<string> {
    // 1. Bullets como contexto (no obligatorios: el resumen ya describe al candidato)
    const bank = await this.bullets.findByProfileId(profile.id);

    // 2. Construir el prompt de la carta
    const template = loadPromptFile('tailor-cover.txt');
    const { system, user } = fillTailorCoverLetterPrompt(template, { job, profile, bullets: bank, lang});

    // 3. Llamar al motor (temp 0.7: tono natural, no mecánico)
    const { text } = await this.client.complete({
      system,
      user,
      operation: 'tailorCoverLetter',
      temperature: 0.7,
      maxTokens: 1500,
    });

    // 4. Validar longitud (guardrail de salida; aquí no hay JSON que parsear)
    const result = TailorCoverLetterSchema.safeParse(text.trim());
    if (!result.success) {
      throw new MalformedLlmResponseError(
        result.error.issues.map((i) => i.message).join('; ')
      );
    }
    return result.data;
  }

  async scoreJob(_job: Job, _profile: Profile): Promise<JobScore> {
    throw new Error('scoreJob: pertenece al embudo de matching (Fase 2)');
  }

  async extractJobs(_rawText: string): Promise<ExtractedJob[]> {
    throw new Error('extractJobs: ingesta de correos (Fase 2)');
  }

  /* ─── Helpers privados ─── */

  /** Parsea el texto de Claude a JSON y valida su estructura con Zod. */
  private parseTailorCvResponse(text: string): ClaudeTailorCvResponse {
    let json: unknown;
    try {
      json = JSON.parse(extractJsonBlock(text));
    } catch {
      throw new MalformedLlmResponseError('la respuesta no es JSON válido');
    }

    const result = ClaudeTailorCvResponseSchema.safeParse(json);
    if (!result.success) {
      throw new MalformedLlmResponseError(
        result.error.issues.map((i) => i.message).join('; ')
      );
    }
    return result.data;
  }
}

/**
 * Extrae el bloque JSON de la respuesta, tolerando que Claude lo envuelva en
 * ```json ... ``` o lo rodee de texto. Busca el primer '{' y el último '}'.
 */
function extractJsonBlock(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  return start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate.trim();
}
