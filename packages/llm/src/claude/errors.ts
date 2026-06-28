/**
 * ERRORES TIPADOS DEL ADAPTER DE CLAUDE
 *
 * Todos extienden DomainError del core. Así:
 *  - El dominio sigue siendo el dueño del manejo de errores (hexagonal).
 *  - Cada error trae un `code` (string estable) y un `statusCode` HTTP,
 *    para que la API (Sprint 4) los mapee a respuestas correctas.
 *
 * Firma de DomainError (definida en core):
 *   constructor(message: string, code = 'DOMAIN_ERROR', statusCode = 400)
 *
 * NOTA: el orden es (message, code, statusCode). El plan original lo tenía
 * invertido; aquí va correcto.
 */

import { DomainError } from '@jobfinder/core';

/**
 * API key ausente o inválida.
 * statusCode 500: es un problema de configuración del servidor, no del usuario.
 */
export class InvalidAnthropicKeyError extends DomainError {
  constructor(message = 'Anthropic API key is missing or invalid') {
    super(message, 'INVALID_ANTHROPIC_KEY', 500);
    Object.setPrototypeOf(this, InvalidAnthropicKeyError.prototype);
  }
}

/**
 * La llamada a Claude superó el timeout (por defecto 30s).
 * statusCode 504: gateway timeout.
 */
export class LlmTimeoutError extends DomainError {
  constructor(timeoutMs: number) {
    super(`Claude API call timed out after ${timeoutMs}ms`, 'LLM_TIMEOUT', 504);
    Object.setPrototypeOf(this, LlmTimeoutError.prototype);
  }
}

/**
 * Rate limit (429) persistente tras agotar los reintentos.
 * statusCode 429: too many requests.
 */
export class LlmRateLimitError extends DomainError {
  constructor(message = 'Claude API rate limit exceeded after retries') {
    super(message, 'LLM_RATE_LIMIT', 429);
    Object.setPrototypeOf(this, LlmRateLimitError.prototype);
  }
}

/**
 * Falla genérica de la llamada tras agotar reintentos (red, 5xx, etc.).
 * statusCode 502: bad gateway (el upstream falló).
 */
export class LlmCallFailedError extends DomainError {
  constructor(message: string) {
    super(`Claude API call failed: ${message}`, 'LLM_CALL_FAILED', 502);
    Object.setPrototypeOf(this, LlmCallFailedError.prototype);
  }
}

/**
 * Claude respondió, pero el contenido no era el JSON/estructura esperada.
 * statusCode 502: el upstream devolvió algo que no podemos usar.
 */
export class MalformedLlmResponseError extends DomainError {
  constructor(reason: string) {
    super(`Claude returned an unusable response: ${reason}`, 'MALFORMED_LLM_RESPONSE', 502);
    Object.setPrototypeOf(this, MalformedLlmResponseError.prototype);
  }
}

/**
 * El perfil no tiene bullets en el banco → no hay nada que seleccionar.
 * statusCode 422: la entrada no se puede procesar (falta data del usuario).
 */
export class ProfileHasNoBulletsError extends DomainError {
  constructor(profileId: string) {
    super(`Profile ${profileId} has no bullets to tailor from`, 'PROFILE_HAS_NO_BULLETS', 422);
    Object.setPrototypeOf(this, ProfileHasNoBulletsError.prototype);
  }
}

/**
 * El output del LLM violó los guardrails (p. ej. inventó un bullet).
 * statusCode 422: unprocessable entity (la salida no pasó validación de negocio).
 */
export class GuardrailViolationError extends DomainError {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`LLM output violated guardrails: ${issues.join('; ')}`, 'GUARDRAIL_VIOLATION', 422);
    this.issues = issues;
    Object.setPrototypeOf(this, GuardrailViolationError.prototype);
  }
}
