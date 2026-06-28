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
import type { BulletValidationResult } from './types';

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
  selected_bullets: z.array(z.string().min(10)).min(1).max(10),
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
 * Verifica que cada bullet devuelto por Claude exista (de forma similar)
 * en el banco autorizado del perfil. Si Claude inventa algo, lo detecta.
 *
 * Similitud: por ahora usamos Jaccard de tokens (sin dependencias). Es una
 * heurística decente y barata. En Fase 2 se reemplaza por similitud coseno
 * de embeddings (más precisa). La INTERFAZ no cambia, solo la implementación.
 */
export class BulletOriginValidator {
  static validate(
    selectedBullets: string[],
    authorizedBullets: Bullet[],
    lang: 'es' | 'en',
    similarityThreshold = 0.5
  ): BulletValidationResult {
    const issues: string[] = [];

    for (const selected of selectedBullets) {
      let best = 0;
      for (const bullet of authorizedBullets) {
        const score = BulletOriginValidator.jaccard(selected, bullet.getText(lang));
        if (score > best) best = score;
      }
      if (best < similarityThreshold) {
        issues.push(
          `"${selected.slice(0, 60)}..." no se encontró en el banco ` +
            `(similitud máx: ${(best * 100).toFixed(0)}%)`
        );
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Similitud Jaccard sobre conjuntos de palabras normalizadas.
   * |A ∩ B| / |A ∪ B|. 1.0 = idénticas, 0.0 = sin palabras en común.
   *
   * Tolera reformulaciones (reordenar/añadir palabras) pero detecta bullets
   * completamente nuevos (pocas palabras en común → score bajo).
   */
  private static jaccard(a: string, b: string): number {
    const setA = BulletOriginValidator.tokenize(a);
    const setB = BulletOriginValidator.tokenize(b);
    if (setA.size === 0 || setB.size === 0) return 0;

    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return intersection / union;
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
