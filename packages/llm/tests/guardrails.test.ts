/**
 * Tests de los guardrails: validación de salida + anti-invención.
 * El más importante: que un bullet inventado por el LLM sea rechazado.
 */
import { describe, it, expect } from 'vitest';
import {
  ClaudeTailorCvResponseSchema,
  TailorCoverLetterSchema,
  BulletOriginValidator,
} from '../src/claude/guardrails';
import { mockBullets } from './fixtures/bullets.mock';

describe('BulletOriginValidator (anti-invención)', () => {
  it('ACEPTA una reformulación de un bullet real del banco', () => {
    // Reformulación cercana del bullet 0 (comparte casi todas las palabras)
    const reformulado = [
      'Designed and maintained a scalable REST API in NestJS handling 10k RPS with low latency',
    ];
    const result = BulletOriginValidator.validate(reformulado, mockBullets, 'en');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('ACEPTA una reformulación LIBRE (regresión: el caso que rompía con Jaccard)', () => {
    // Reformulación realista: mismo hecho, redactado de cero — comprime, cambia
    // conectores y sustituye sinónimos. Es lo que el prompt le pide a Claude.
    // Con Jaccard caía por debajo del umbral y se rechazaba como "inventado".
    const reformulado = [
      'Built and maintained a scalable NestJS REST API sustaining 10k requests per second at low latency',
    ];
    const result = BulletOriginValidator.validate(reformulado, mockBullets, 'en');
    expect(result.valid).toBe(true);
  });

  it('RECHAZA un bullet inventado que no está en el banco', () => {
    const inventado = ['Led a team of 50 engineers across three countries'];
    const result = BulletOriginValidator.validate(inventado, mockBullets, 'en');
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
  });

  it('detecta solo el inventado cuando se mezclan reales y falsos', () => {
    const mezcla = [
      'Designed and maintained a scalable REST API in NestJS handling 10k RPS with low latency', // real
      'Won a Nobel Prize in Physics for quantum computing', // inventado
    ];
    const result = BulletOriginValidator.validate(mezcla, mockBullets, 'en');
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toContain('Nobel');
  });
});

describe('ClaudeTailorCvResponseSchema', () => {
  it('valida una respuesta bien formada', () => {
    const ok = {
      selected_bullets: ['Diseñé una API REST escalable en NestJS con alta concurrencia'],
      keywords: ['NestJS', 'REST'],
      reasoning_summary: 'opcional',
    };
    expect(ClaudeTailorCvResponseSchema.safeParse(ok).success).toBe(true);
  });

  it('rechaza si falta selected_bullets', () => {
    const bad = { keywords: ['x'] };
    expect(ClaudeTailorCvResponseSchema.safeParse(bad).success).toBe(false);
  });

  it('rechaza si selected_bullets está vacío', () => {
    const bad = { selected_bullets: [], keywords: ['x'] };
    expect(ClaudeTailorCvResponseSchema.safeParse(bad).success).toBe(false);
  });
});

describe('TailorCoverLetterSchema', () => {
  it('acepta una carta de longitud razonable', () => {
    const carta = 'a'.repeat(800);
    expect(TailorCoverLetterSchema.safeParse(carta).success).toBe(true);
  });

  it('rechaza una respuesta demasiado corta (probable error/vacía)', () => {
    expect(TailorCoverLetterSchema.safeParse('muy corta').success).toBe(false);
  });
});
