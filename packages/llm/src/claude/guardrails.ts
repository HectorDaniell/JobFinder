/**
 * GUARDRAILS — validación con Zod + anti-invención
 *
 * Tres capas de protección:
 *  1. INPUT  — validar lo que entra ANTES de gastar una llamada a Claude.
 *  2. OUTPUT — validar que la respuesta de Claude tenga la forma esperada.
 *  3. ORIGEN — verificar que cada bullet provenga del banco real (anti-invención).
 *
 * Por qué separado: fácil de testear y de cambiar sin tocar la lógica del adapter.
 */

import { z } from 'zod';
import type { Bullet } from '@jobfinder/core';
import type { BulletValidationResult, BulletMatch } from './types';

/* ============ 1. INPUT GUARDRAILS ============ */

export const TailorCvInputSchema = z.object({
  job: z.custom<import('@jobfinder/core').Job>(),
  profile: z.custom<import('@jobfinder/core').Profile>(),
  lang: z.enum(['es', 'en']),
});

export const TailorCoverLetterInputSchema = z.object({
  job: z
    .custom<import('@jobfinder/core').Job>()
    .refine(
      (j) => Boolean(j?.description) && j.description.length >= 50,
      'Job description must be at least 50 characters'
    ),
  profile: z.custom<import('@jobfinder/core').Profile>(),
  lang: z.enum(['es', 'en']),
});

/* ============ 2. OUTPUT GUARDRAILS ============ */

/**
 * Forma CRUDA que esperamos de Claude para tailorCv.
 * Coincide con lo que pide el prompt (`selected_bullets`, no `bullets`).
 * El adapter luego mapea esto al `TailoredCv` del core.
 */
export const ClaudeTailorCvResponseSchema = z.object({
  // min 40: un logro de CV es una frase, no un fragmento. Además evita que un
  // texto muy corto infle el coeficiente de solapamiento del anti-invención.
  selected_bullets: z.array(z.string().min(40)).min(1).max(10),
  keywords: z.array(z.string().min(2)).min(1).max(20),
  reasoning_summary: z.string().optional(),
});

/**
 * La carta de presentación: texto plano, longitud razonable.
 * Máx 3000 chars: el prompt pide 250–400 palabras (≈ hasta ~2400 chars) + holgura.
 * Mín 200: piso para detectar respuestas vacías o truncadas.
 */
export const TailorCoverLetterSchema = z.string().min(200).max(3000);

/* ============ 3. ANTI-INVENCIÓN ============ */

/**
 * Verifica que cada bullet devuelto por Claude PROVENGA del banco autorizado
 * del perfil. Si Claude inventa algo, lo detecta.
 *
 * Similitud: COEFICIENTE DE SOLAPAMIENTO (contención), |A ∩ B| / min(|A|,|B|).
 *
 * Antes usábamos Jaccard (|A ∩ B| / |A ∪ B|), pero es SIMÉTRICO: penaliza que
 * los textos tengan distinta longitud o vocabulario, que es exactamente lo que
 * produce una reformulación —justo lo que el prompt le PIDE a Claude—. Medido
 * con bullets reales, las reformulaciones legítimas caían al 40–50% y algunas
 * se rechazaban como si fueran inventadas.
 *
 * La pregunta correcta no es "¿se parecen?" sino "¿esto SALE de aquello?", y eso
 * es contención: qué parte del vocabulario del texto más corto aparece en el
 * otro. Con los mismos datos, las reformulaciones suben a 63–85% mientras que un
 * bullet inventado sigue en 0%: la separación es mucho más limpia.
 *
 * En Fase 2 se reemplaza por similitud coseno de embeddings (más precisa). La
 * INTERFAZ no cambia, solo la implementación.
 *
 * Además de validar, RESUELVE cada bullet seleccionado a su origen (`matches`):
 * qué bullet real del banco fue el mejor match. El adapter reutiliza esa
 * resolución —no solo el veredicto— para saber la categoría y la experiencia
 * de cada bullet reformulado y así agrupar el CV por empresa (Paso 1d). Una
 * sola pasada calcula ambas cosas: repetir el bucle sería recalcular lo mismo.
 */
export class BulletOriginValidator {
  static validate(
    selectedBullets: string[],
    authorizedBullets: Bullet[],
    lang: 'es' | 'en',
    similarityThreshold = 0.5
  ): BulletValidationResult {
    const issues: string[] = [];
    const matches: BulletMatch[] = [];

    for (const selected of selectedBullets) {
      let best = 0;
      let bestBullet: Bullet | undefined;
      for (const bullet of authorizedBullets) {
        const score = BulletOriginValidator.overlap(selected, bullet.getText(lang));
        if (score > best) {
          best = score;
          bestBullet = bullet;
        }
      }

      const matched = best >= similarityThreshold;
      matches.push({ text: selected, matchedBullet: matched ? bestBullet : undefined, score: best });

      if (!matched) {
        issues.push(
          `"${selected.slice(0, 60)}..." no se encontró en el banco ` +
            `(similitud máx: ${(best * 100).toFixed(0)}%)`
        );
      }
    }

    return { valid: issues.length === 0, issues, matches };
  }

  /**
   * Coeficiente de solapamiento sobre conjuntos de palabras normalizadas.
   * |A ∩ B| / min(|A|, |B|). 1.0 = el texto corto está contenido en el largo;
   * 0.0 = sin palabras en común.
   *
   * Al dividir por el conjunto MÁS PEQUEÑO, reformular (comprimir, ampliar o
   * cambiar conectores) no penaliza: lo que mide es cuánto del vocabulario
   * compartido se conserva. Un bullet inventado no comparte casi nada → ~0.
   *
   * Nota: un texto muy corto podría inflar el score (pocos tokens, todos
   * coincidentes). Lo cubre el mínimo de longitud del schema de salida.
   */
  private static overlap(a: string, b: string): number {
    const setA = BulletOriginValidator.tokenize(a);
    const setB = BulletOriginValidator.tokenize(b);
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }
    return intersection / Math.min(setA.size, setB.size);
  }

  /** Pasa a minúsculas, quita puntuación y parte en palabras (≥ 3 letras). */
  private static tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    );
  }
}

/* ============ TIPOS DERIVADOS ============ */

export type ValidatedClaudeTailorCvResponse = z.infer<typeof ClaudeTailorCvResponseSchema>;
