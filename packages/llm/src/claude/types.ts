/**
 * TIPOS ESPECÍFICOS DE CLAUDE ADAPTER
 *
 * Aquí vive la tipología interna del adapter de Claude.
 *
 * REGLA IMPORTANTE (hexagonal):
 * El "contrato" público (qué devuelve tailorCv) lo define el CORE en
 * packages/core/ports/LlmPort.ts → `TailoredCv`. NO lo redefinimos aquí.
 * Solo re-exportamos ese tipo para comodidad, y definimos los tipos
 * INTERNOS que el core no necesita conocer (la forma cruda de la respuesta
 * de Claude, los eventos de costo, la config del cliente, etc.).
 */

import type { Job, Profile } from '@jobfinder/core';

/**
 * Re-export del contrato público.
 * Quien importe `TailoredCv` desde '@jobfinder/llm' obtiene EXACTAMENTE
 * el mismo tipo que define el core. Una sola fuente de verdad.
 *
 * Forma (definida en core):
 *   { content: string; bullets: TailoredBullet[]; keywords: string[] }
 */
export type { TailoredCv } from '@jobfinder/core';

/**
 * Operaciones que registramos para costo/observabilidad.
 * Cada llamada a Claude pertenece a una de estas.
 */
export type LlmOperation =
  | 'tailorCv'
  | 'tailorCoverLetter'
  | 'extractJobs'
  | 'scoreJob';

/**
 * INPUT: parámetros para tailorCv()
 * (lo que recibe nuestra función antes de hablar con Claude)
 */
export interface TailorCvInput {
  job: Job;
  profile: Profile;
  lang: 'es' | 'en';
}

/**
 * INPUT: parámetros para tailorCoverLetter()
 */
export interface TailorCoverLetterInput {
  job: Job;
  profile: Profile;
  lang: 'es' | 'en';
}

/**
 * RESPUESTA CRUDA DE CLAUDE para tailorCv (lo que pide el prompt).
 *
 * OJO: esto NO es el contrato público. El prompt le pide a Claude un JSON
 * con `selected_bullets`. Luego el adapter MAPEA esto al `TailoredCv` del
 * core (selected_bullets → bullets, + arma `content`).
 *
 * Separar "lo que devuelve el LLM" de "lo que expone el dominio" nos deja
 * cambiar el prompt sin tocar el contrato, y viceversa.
 */
export interface ClaudeTailorCvResponse {
  selected_bullets: string[];
  keywords: string[];
  reasoning_summary?: string;
}

/**
 * EVENTO DE USO DE LLM (para tracking de costo y auditoría).
 *
 * Se construye después de CADA llamada (éxito o error) y, opcionalmente,
 * se persiste en la tabla `llm_usage` (cuando exista su repositorio).
 */
export interface LlmUsageEvent {
  operation: LlmOperation;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number; // USD
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  timestamp: Date;
}

/**
 * CONFIGURACIÓN del ClaudeClient (el "motor").
 *
 * apiKey es lo único obligatorio; el resto tiene defaults sensatos.
 */
export interface ClaudeAdapterConfig {
  apiKey: string;
  model?: string; // default: claude-sonnet-4-6
  maxRetries?: number; // default: 3
  timeoutMs?: number; // default: 30000
}

/**
 * Un bullet seleccionado por Claude, resuelto contra el banco original.
 * `matchedBullet` es el bullet REAL cuyo texto se parece más al que Claude
 * devolvió — de ahí sacamos `category`/`experienceId` para el CV agrupado
 * (Sprint 6, Paso 1d). Undefined solo si NINGÚN bullet superó el umbral (en
 * ese caso `valid` ya es false y el adapter lanza antes de mirar `matches`).
 */
export interface BulletMatch {
  text: string;
  matchedBullet?: import('@jobfinder/core').Bullet;
  score: number;
}

/**
 * RESULTADO de la validación anti-invención de bullets.
 * (lo usa BulletOriginValidator en guardrails.ts)
 */
export interface BulletValidationResult {
  valid: boolean;
  issues: string[];
  matches: BulletMatch[];
}
