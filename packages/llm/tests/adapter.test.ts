/**
 * Tests del ClaudeAdapter — el pipeline completo, SIN llamar a Claude.
 *
 * Mockeamos lo que el adapter recibe por constructor:
 *  - ClaudeClient.complete  → con vi.spyOn (devuelve un texto fijo que controlamos)
 *  - BulletProvider          → un objeto falso con findByProfileId
 *
 * Esto es posible gracias a la inyección de dependencias.
 */
import { describe, it, expect, vi } from 'vitest';
import type { Bullet } from '@jobfinder/core';
import { ClaudeClient } from '../src/claude/client';
import { ClaudeAdapter } from '../src/claude/adapter';
import {
  GuardrailViolationError,
  MalformedLlmResponseError,
  ProfileHasNoBulletsError,
} from '../src/claude/errors';
import { mockProfile } from './fixtures/profile.mock';
import { mockBullets } from './fixtures/bullets.mock';
import { mockJobSeniorBackendEN } from './fixtures/jobs.mock';

const job = mockJobSeniorBackendEN;
const lang = 'en' as const;

/** Arma un adapter con ClaudeClient mockeado y un BulletProvider falso. */
function setup(bullets: Bullet[] = mockBullets) {
  const client = new ClaudeClient({ apiKey: 'test-key' }); // no usa red: mockeamos complete()
  const complete = vi.spyOn(client, 'complete');
  const findByProfileId = vi.fn<[string], Promise<Bullet[]>>().mockResolvedValue(bullets);
  const adapter = new ClaudeAdapter(client, { findByProfileId });
  return { adapter, complete, findByProfileId };
}

/**
 * El TailoredBullet esperado para `text`: su ORIGEN es el bullet i del banco.
 * Todo salvo el texto debe venir del banco real, nunca de Claude.
 */
function origin(i: number, text: string) {
  return {
    text,
    category: mockBullets[i].category,
    experienceId: mockBullets[i].experienceId,
    sourceRole: mockBullets[i].sourceRole,
    skills: mockBullets[i].skills,
  };
}

/** Empaqueta un texto como si fuera la salida del motor. */
function fromClaude(text: string) {
  return {
    text,
    usage: { inputTokens: 100, outputTokens: 50 },
    costEstimate: 0.001,
    latencyMs: 10,
    model: 'claude-sonnet-4-6',
  };
}

describe('ClaudeAdapter.tailorCv', () => {
  it('happy path: parsea, valida y mapea a TailoredCv', async () => {
    const { adapter, complete } = setup();
    const b0 = mockBullets[0].textEn;
    const b1 = mockBullets[1].textEn;
    complete.mockResolvedValue(
      fromClaude(JSON.stringify({ selected_bullets: [b0, b1], keywords: ['Node.js', 'REST'] }))
    );

    const result = await adapter.tailorCv(job, mockProfile, lang);

    // bullets ahora son objetos: texto + de dónde vienen en el banco original
    // (category/experienceId/sourceRole), no strings sueltos — eso es lo que
    // documents usa para agrupar el CV por empresa y por contexto (Paso 1d).
    expect(result.bullets).toEqual([origin(0, b0), origin(1, b1)]);
    expect(result.keywords).toEqual(['Node.js', 'REST']);
    expect(result.content).toContain('•');
    // mock = stub + verificación: confirmamos que llamó al motor con la operación correcta
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'tailorCv', temperature: 0.3 })
    );
  });

  it('tolera JSON envuelto en bloque de código markdown', async () => {
    const { adapter, complete } = setup();
    const b0 = mockBullets[0].textEn;
    const fenced = '```json\n' + JSON.stringify({ selected_bullets: [b0], keywords: ['Node', 'REST'] }) + '\n```';
    complete.mockResolvedValue(fromClaude(fenced));

    const result = await adapter.tailorCv(job, mockProfile, lang);
    expect(result.bullets).toEqual([origin(0, b0)]);
  });

  it('RECHAZA si TODOS los bullets son inventados (nada válido que ofrecer)', async () => {
    const { adapter, complete } = setup();
    complete.mockResolvedValue(
      fromClaude(
        JSON.stringify({
          selected_bullets: ['Won a Nobel Prize in Physics for quantum computing'],
          keywords: ['Physics'],
        })
      )
    );

    await expect(adapter.tailorCv(job, mockProfile, lang)).rejects.toThrow(GuardrailViolationError);
  });

  it('degrada con gracia: si hay MEZCLA de reales e inventados, descarta solo el inventado', async () => {
    const { adapter, complete } = setup();
    const real = mockBullets[0].textEn;
    complete.mockResolvedValue(
      fromClaude(
        JSON.stringify({
          selected_bullets: [real, 'Won a Nobel Prize in Physics for quantum computing'],
          keywords: ['NestJS'],
        })
      )
    );

    const result = await adapter.tailorCv(job, mockProfile, lang);

    // El inventado desaparece; el real sobrevive con su origen intacto.
    expect(result.bullets).toEqual([origin(0, real)]);
  });

  it('lanza ProfileHasNoBulletsError si el perfil no tiene bullets', async () => {
    const { adapter, complete } = setup([]); // banco vacío
    await expect(adapter.tailorCv(job, mockProfile, lang)).rejects.toThrow(ProfileHasNoBulletsError);
    expect(complete).not.toHaveBeenCalled(); // ni siquiera llegó a llamar a Claude
  });

  it('lanza MalformedLlmResponseError si la respuesta no es JSON', async () => {
    const { adapter, complete } = setup();
    complete.mockResolvedValue(fromClaude('esto no es json'));
    await expect(adapter.tailorCv(job, mockProfile, lang)).rejects.toThrow(MalformedLlmResponseError);
  });
});

describe('ClaudeAdapter.tailorCoverLetter', () => {
  it('happy path: devuelve la carta como string', async () => {
    const { adapter, complete } = setup();
    const carta = 'Dear Hiring Manager, '.padEnd(800, 'x');
    complete.mockResolvedValue(fromClaude(carta));

    const result = await adapter.tailorCoverLetter(job, mockProfile, lang);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThanOrEqual(200);
    expect(complete).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'tailorCoverLetter', temperature: 0.7 })
    );
  });

  it('lanza MalformedLlmResponseError si la carta es demasiado corta', async () => {
    const { adapter, complete } = setup();
    complete.mockResolvedValue(fromClaude('muy corta'));
    await expect(adapter.tailorCoverLetter(job, mockProfile, lang)).rejects.toThrow(
      MalformedLlmResponseError
    );
  });
});
