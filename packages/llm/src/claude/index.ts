/**
 * BARREL EXPORT: packages/llm/src/claude/
 *
 * Decide QUÉ se expone públicamente del módulo claude.
 * Solo exportamos lo que ya existe y es público.
 */

// ---- Tipos públicos ----
export type {
  TailoredCv, // re-exportado desde el core (contrato del puerto)
  TailorCvInput,
  TailorCoverLetterInput,
  ClaudeTailorCvResponse,
  LlmOperation,
  LlmUsageEvent,
  ClaudeAdapterConfig,
  BulletValidationResult,
} from './types';

// ---- Errores tipados ----
export {
  InvalidAnthropicKeyError,
  LlmTimeoutError,
  LlmRateLimitError,
  LlmCallFailedError,
  MalformedLlmResponseError,
  GuardrailViolationError,
} from './errors';

// ---- Motor + costo ----
export { ClaudeClient, type CompleteParams, type CompleteResult } from './client';
export { CostLogger, CLAUDE_MODELS, type ClaudeModelId, type UsageSink } from './cost-logger';

// ---- Guardrails ----
export {
  TailorCvInputSchema,
  TailorCoverLetterInputSchema,
  ClaudeTailorCvResponseSchema,
  TailorCoverLetterSchema,
  BulletOriginValidator,
} from './guardrails';

// ---- Adapter de alto nivel (implements LlmPort) ----
// Se exportará cuando lo implementemos en el siguiente paso (tailorCv/cover).
// export { ClaudeAdapter } from './adapter';
