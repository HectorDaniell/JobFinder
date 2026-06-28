/**
 * Tests del CostLogger — el cálculo de costo es pura matemática, sin mocks.
 */
import { describe, it, expect } from 'vitest';
import { CostLogger, CLAUDE_MODELS } from '../src/claude/cost-logger';

describe('CostLogger.calculateCost', () => {
  it('calcula el costo de Sonnet (input $3 / output $15 por millón)', () => {
    // 1000 input + 1000 output → (1000*3 + 1000*15) / 1_000_000 = 0.018
    const cost = CostLogger.calculateCost(CLAUDE_MODELS.SONNET, 1000, 1000);
    expect(cost).toBeCloseTo(0.018, 6);
  });

  it('calcula el costo de Haiku (input $1 / output $5 por millón)', () => {
    // 1M input + 1M output → 1 + 5 = 6 USD
    const cost = CostLogger.calculateCost(CLAUDE_MODELS.HAIKU, 1_000_000, 1_000_000);
    expect(cost).toBe(6);
  });

  it('retorna 0 para un modelo desconocido (no rompe la operación)', () => {
    expect(CostLogger.calculateCost('modelo-inexistente', 1000, 1000)).toBe(0);
  });

  it('un tailor típico cuesta ~medio centavo', () => {
    // 380 input + 250 output con Sonnet → ~$0.0049
    const cost = CostLogger.calculateCost(CLAUDE_MODELS.SONNET, 380, 250);
    expect(cost).toBeCloseTo(0.00489, 5);
  });
});

describe('CostLogger.buildEvent', () => {
  it('construye un evento de uso con costo y timestamp', () => {
    const event = CostLogger.buildEvent({
      operation: 'tailorCv',
      model: CLAUDE_MODELS.SONNET,
      inputTokens: 380,
      outputTokens: 250,
      latencyMs: 1200,
      success: true,
    });

    expect(event.operation).toBe('tailorCv');
    expect(event.success).toBe(true);
    expect(event.costEstimate).toBeCloseTo(0.00489, 5);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('registra también los fallos (con errorCode)', () => {
    const event = CostLogger.buildEvent({
      operation: 'tailorCv',
      model: CLAUDE_MODELS.SONNET,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 50,
      success: false,
      errorCode: 'RateLimitError',
    });

    expect(event.success).toBe(false);
    expect(event.errorCode).toBe('RateLimitError');
    expect(event.costEstimate).toBe(0);
  });
});
