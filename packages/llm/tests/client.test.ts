/**
 * Tests del ClaudeClient (el motor) — mockeamos el SDK de Anthropic.
 *
 * Truco para el instanceof: Object.create(Clase.prototype) crea un objeto que
 * pasa `x instanceof Clase` sin necesitar el constructor real del SDK.
 *
 * Truco para el backoff: vi.useFakeTimers() + runAllTimersAsync() "salta" la
 * espera del retry (1s, 2s) sin que el test tarde de verdad.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { ClaudeClient } from '../src/claude/client';
import { InvalidAnthropicKeyError } from '../src/claude/errors';

/** Respuesta válida tal como la devuelve el SDK (content + usage). */
const okMessage = {
  content: [{ type: 'text', text: '{"ok":true}' }],
  usage: { input_tokens: 10, output_tokens: 5 },
};

const params = { system: 'sys', user: 'usr', operation: 'tailorCv' as const };

describe('ClaudeClient (constructor)', () => {
  it('lanza InvalidAnthropicKeyError si la API key está vacía', () => {
    expect(() => new ClaudeClient({ apiKey: '' })).toThrow(InvalidAnthropicKeyError);
  });

  it('lanza InvalidAnthropicKeyError si la API key es solo espacios', () => {
    expect(() => new ClaudeClient({ apiKey: '   ' })).toThrow(InvalidAnthropicKeyError);
  });
});

describe('ClaudeClient.complete', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('registra el evento de costo en el usageSink al tener éxito', async () => {
    const sink = vi.fn();
    const client = new ClaudeClient({ apiKey: 'k' }, sink);
    // reemplazamos el método del SDK interno (private) por un mock
    (client as unknown as { client: { messages: { create: unknown } } }).client.messages.create =
      vi.fn().mockResolvedValue(okMessage);

    const res = await client.complete(params);

    expect(res.text).toBe('{"ok":true}');
    expect(res.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(sink).toHaveBeenCalledOnce();
    expect(sink.mock.calls[0][0].success).toBe(true);
  });

  it('reintenta tras un 429 (rate limit) y luego tiene éxito', async () => {
    vi.useFakeTimers();
    const client = new ClaudeClient({ apiKey: 'k' });
    const rateLimit = Object.create(Anthropic.RateLimitError.prototype);
    const create = vi
      .fn()
      .mockRejectedValueOnce(rateLimit) // 1er intento: 429
      .mockResolvedValueOnce(okMessage); // 2º intento: ok
    (client as unknown as { client: { messages: { create: unknown } } }).client.messages.create = create;

    const promise = client.complete(params);
    await vi.runAllTimersAsync(); // salta el backoff sin esperar de verdad
    const res = await promise;

    expect(res.text).toBe('{"ok":true}');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('NO reintenta ante error de autenticación → InvalidAnthropicKeyError', async () => {
    const client = new ClaudeClient({ apiKey: 'k' });
    const authError = Object.create(Anthropic.AuthenticationError.prototype);
    const create = vi.fn().mockRejectedValue(authError);
    (client as unknown as { client: { messages: { create: unknown } } }).client.messages.create = create;

    await expect(client.complete(params)).rejects.toThrow(InvalidAnthropicKeyError);
    expect(create).toHaveBeenCalledTimes(1); // sin reintentos: reintentar una key mala no ayuda
  });
});
