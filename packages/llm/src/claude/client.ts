/**
 * CLAUDE CLIENT — el "motor" del adapter
 *
 * Envuelve el SDK oficial (@anthropic-ai/sdk) y centraliza:
 *  1. Validación de la API key
 *  2. Timeout por llamada
 *  3. Reintentos con backoff exponencial (rate limits / errores de red)
 *  4. Mapeo de errores del SDK → errores tipados del dominio
 *  5. Medición de tokens + costo + latencia (vía CostLogger)
 *
 * tailorCv / tailorCoverLetter / extractJobs (siguientes pasos) NO hablan
 * con el SDK directamente: todos pasan por complete(). Un único punto de
 * control para retry, timeout, errores y costo.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ClaudeAdapterConfig, LlmOperation } from './types';
import { CostLogger, CLAUDE_MODELS, type UsageSink } from './cost-logger';
import { InvalidAnthropicKeyError, LlmTimeoutError, LlmRateLimitError, LlmCallFailedError } from './errors';

/**
 * Lo que recibe complete(): un system prompt, un user prompt y parámetros.
 * `operation` es solo para el logging de costo (saber qué operación fue).
 */
export interface CompleteParams {
  system: string;
  user: string;
  operation: LlmOperation;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Lo que devuelve complete(): el texto crudo de Claude + métricas.
 * El PARSEO del texto (a JSON, etc.) lo hace quien llama (tailorCv), no el motor.
 */
export interface CompleteResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  costEstimate: number;
  latencyMs: number;
  model: string;
}

export class ClaudeClient {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly baseDelayMs = 1000; // primer reintento espera ~1s
  private readonly usageSink?: UsageSink;

  /**
   * @param config  apiKey obligatoria; model/maxRetries/timeoutMs opcionales.
   * @param usageSink  callback opcional para persistir el evento de costo
   *                   (p. ej. guardarlo en la tabla llm_usage). Si no se
   *                   pasa, los eventos solo se calculan y se devuelven.
   */
  constructor(config: ClaudeAdapterConfig, usageSink?: UsageSink) {
    // 1. VALIDACIÓN: sin API key no hay nada que hacer. Fallar rápido y claro.
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new InvalidAnthropicKeyError();
    }

    this.model = config.model ?? CLAUDE_MODELS.SONNET;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.usageSink = usageSink;

    // maxRetries: 0 → desactivamos el retry interno del SDK porque hacemos
    // el nuestro (explícito y observable). Si no, se "duplicarían" los reintentos.
    this.client = new Anthropic({ apiKey: config.apiKey, maxRetries: 0 });
  }

  /**
   * Realiza una llamada a Claude con retry + timeout + logging de costo.
   *
   * Flujo:
   *   start timer
   *   → withRetry( messages.create(...) )   // reintenta 429/timeout/red
   *   → extraer texto + tokens
   *   → calcular costo, construir evento, mandarlo al sink
   *   → devolver { text, usage, costEstimate, latencyMs, model }
   */
  async complete(params: CompleteParams): Promise<CompleteResult> {
    const model = params.model ?? this.model;
    const startedAt = Date.now();

    try {
      const response = await this.withRetry(() =>
        this.client.messages.create(
          {
            model,
            max_tokens: params.maxTokens ?? 1024,
            temperature: params.temperature ?? 0.3,
            system: params.system,
            messages: [{ role: 'user', content: params.user }],
          },
          // Timeout por intento (lo aplica el SDK). maxRetries 0: el retry es nuestro.
          { timeout: this.timeoutMs, maxRetries: 0 }
        )
      );

      const latencyMs = Date.now() - startedAt;

      // Extraer el primer bloque de texto de la respuesta.
      const textBlock = response.content.find((b) => b.type === 'text');
      const text = textBlock && 'text' in textBlock ? textBlock.text : '';

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const costEstimate = CostLogger.calculateCost(model, inputTokens, outputTokens);

      // Registrar evento de costo (éxito).
      await this.emitUsage({
        operation: params.operation,
        model,
        inputTokens,
        outputTokens,
        latencyMs,
        success: true,
      });

      return {
        text,
        usage: { inputTokens, outputTokens },
        costEstimate,
        latencyMs,
        model,
      };
    } catch (error) {
      // Registrar evento de costo (fallo): tokens 0, pero queda traza del intento.
      await this.emitUsage({
        operation: params.operation,
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
      });
      throw error;
    }
  }

  /**
   * Ejecuta `fn` con reintentos y backoff exponencial.
   *
   * Política:
   *  - 429 (rate limit) o errores de conexión/timeout → reintentar
   *    esperando baseDelay × 2^intento (1s, 2s, 4s...).
   *  - 401 (auth)  → fallar inmediato (reintentar no ayuda).
   *  - Otros       → fallar inmediato.
   *  - Si se agotan los reintentos → error tipado según la última causa.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Auth: no tiene sentido reintentar una key inválida.
        if (error instanceof Anthropic.AuthenticationError) {
          throw new InvalidAnthropicKeyError(error.message);
        }

        // Rate limit o problemas de red/timeout → reintentar con backoff.
        const isRetryable =
          error instanceof Anthropic.RateLimitError ||
          error instanceof Anthropic.APIConnectionError; // incluye timeouts de conexión

        if (isRetryable && attempt < this.maxRetries - 1) {
          await this.sleep(this.baseDelayMs * 2 ** attempt);
          continue;
        }

        // No reintentable, o se acabaron los intentos: salir del loop.
        break;
      }
    }

    // Traducir la última causa a un error tipado del dominio.
    if (lastError instanceof Anthropic.RateLimitError) {
      throw new LlmRateLimitError();
    }
    if (lastError instanceof Anthropic.APIConnectionTimeoutError) {
      throw new LlmTimeoutError(this.timeoutMs);
    }
    throw new LlmCallFailedError(
      lastError instanceof Error ? lastError.message : String(lastError)
    );
  }

  /** Construye el evento de costo y lo manda al sink (si hay). */
  private async emitUsage(params: {
    operation: LlmOperation;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorCode?: string;
  }): Promise<void> {
    const event = CostLogger.buildEvent(params);
    if (this.usageSink) {
      await this.usageSink(event);
    }
  }

  /** Pausa N milisegundos (para el backoff). */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
