import type { LlmPort } from '@jobfinder/core';
import {
  ClaudeAdapter,
  ClaudeClient,
  InvalidAnthropicKeyError,
  type BulletProvider,
} from '@jobfinder/llm';

/**
 * Construye un LlmPort PEREZOSO.
 *
 * El ClaudeClient exige ANTHROPIC_API_KEY en su constructor (lanza si falta).
 * Si lo construyéramos al arrancar, la API entera no levantaría sin la key —
 * ni siquiera el CRUD o /health, que no la necesitan.
 *
 * En su lugar, diferimos la creación del cliente a la PRIMERA llamada real al
 * LLM (es decir, al invocar POST /tailor). Así:
 *   - La API arranca y sirve el CRUD sin ANTHROPIC_API_KEY.
 *   - Solo /tailor la requiere; si falta, lanza InvalidAnthropicKeyError
 *     (un DomainError -> 500) que el DomainExceptionFilter traduce.
 *
 * Devolvemos un objeto que cumple LlmPort y delega cada método al adapter real,
 * creándolo (una sola vez) cuando se necesita.
 */
export function createLazyLlm(bullets: BulletProvider): LlmPort {
  let adapter: ClaudeAdapter | null = null;

  const get = (): ClaudeAdapter => {
    if (!adapter) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new InvalidAnthropicKeyError();
      }
      adapter = new ClaudeAdapter(new ClaudeClient({ apiKey }), bullets);
    }
    return adapter;
  };

  return {
    extractJobs: (rawText) => get().extractJobs(rawText),
    scoreJob: (job, profile) => get().scoreJob(job, profile),
    tailorCv: (job, profile, lang) => get().tailorCv(job, profile, lang),
    tailorCoverLetter: (job, profile, lang) => get().tailorCoverLetter(job, profile, lang),
  };
}
