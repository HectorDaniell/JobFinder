/**
 * COST LOGGER — cálculo y registro del costo de cada llamada a Claude
 *
 * El PRD (RNF-02) exige control de costos con presupuesto diario.
 * Esta clase es la base: calcula el costo en USD a partir de los tokens
 * y construye un evento de uso. La PERSISTENCIA (guardar en la tabla
 * `llm_usage`) se inyecta como un "sink" opcional, así esta clase no
 * depende de la base de datos (hexagonal: el adapter no conoce la infra).
 *
 * Precios: tomados de la referencia oficial de la API de Claude.
 * Si cambian, se actualizan AQUÍ (única fuente de verdad de precios).
 */

import type { LlmOperation, LlmUsageEvent } from './types';

/**
 * IDs de modelo vigentes (NO usar IDs con sufijo de fecha; estos son completos).
 *
 * Tiering según ARQUITECTURA.md ADR-003:
 *  - HAIKU  → filtros baratos / extracción de vacantes (Fase 2)
 *  - SONNET → scoring y tailoring (el sweet spot costo/calidad de Fase 1)
 *  - OPUS   → reservado para casos que exijan máximo razonamiento
 */
export const CLAUDE_MODELS = {
  HAIKU: 'claude-haiku-4-5',
  SONNET: 'claude-sonnet-4-6',
  OPUS: 'claude-opus-4-8',
} as const;

export type ClaudeModelId = (typeof CLAUDE_MODELS)[keyof typeof CLAUDE_MODELS];

/**
 * Precios en USD por 1 millón de tokens (input / output).
 * Fuente: referencia oficial de modelos de Claude.
 */
interface ModelPricing {
  inputPerMtok: number;
  outputPerMtok: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': { inputPerMtok: 1, outputPerMtok: 5 },
  'claude-sonnet-4-6': { inputPerMtok: 3, outputPerMtok: 15 },
  'claude-opus-4-8': { inputPerMtok: 5, outputPerMtok: 25 },
};

/**
 * Un "sink" es cualquier función que reciba el evento de uso y lo guarde.
 * Hoy: console.log. Mañana: LlmUsageRepository.create(event).
 * El cliente recibe esto por inyección; el CostLogger no decide DÓNDE se guarda.
 */
export type UsageSink = (event: LlmUsageEvent) => void | Promise<void>;

export class CostLogger {
  /**
   * Calcula el costo en USD de una llamada.
   *
   * Fórmula: (inputTokens × precioInput + outputTokens × precioOutput) / 1M
   *
   * Ejemplo (Sonnet, 380 input + 250 output):
   *   (380 × 3 + 250 × 15) / 1_000_000
   *   = (1140 + 3750) / 1_000_000
   *   = 4890 / 1_000_000
   *   ≈ $0.0049  → medio centavo, como estimaba el plan.
   *
   * Si el modelo no está en la tabla de precios, retorna 0 y no rompe
   * (para no tumbar una operación por un precio desconocido).
   */
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
      return 0;
    }
    const inputCost = (inputTokens * pricing.inputPerMtok) / 1_000_000;
    const outputCost = (outputTokens * pricing.outputPerMtok) / 1_000_000;
    return inputCost + outputCost;
  }

  /**
   * Construye un evento de uso listo para registrar.
   * (separado de record() para poder testearlo sin efectos secundarios)
   */
  static buildEvent(params: {
    operation: LlmOperation;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorCode?: string;
  }): LlmUsageEvent {
    return {
      operation: params.operation,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costEstimate: CostLogger.calculateCost(
        params.model,
        params.inputTokens,
        params.outputTokens
      ),
      latencyMs: params.latencyMs,
      success: params.success,
      errorCode: params.errorCode,
      timestamp: new Date(),
    };
  }
}
