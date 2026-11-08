/**
 * Tests del prompt-loader: extracción de secciones y relleno de placeholders.
 * Parte pura (con plantilla inline) + verificación con el .txt real.
 */
import { describe, it, expect } from 'vitest';
import {
  extractSection,
  fillTailorCvPrompt,
  fillTailorCoverLetterPrompt,
  loadPromptFile,
} from '../src/claude/prompt-loader';
import { mockProfile } from './fixtures/profile.mock';
import { mockBullets } from './fixtures/bullets.mock';
import { mockJobSeniorBackendEN } from './fixtures/jobs.mock';

const INLINE_TEMPLATE = `===== SYSTEM MESSAGE =====
You are a helper.
===== USER MESSAGE =====
Job: {JD_TEXT}
Name: {FULL_NAME}
Bank:
{BULLETS_NUMBERED_LIST}
===== TEMPERATURE & PARAMETERS =====
temperature: 0.3`;

describe('extractSection', () => {
  it('extrae el bloque SYSTEM', () => {
    expect(extractSection(INLINE_TEMPLATE, 'SYSTEM MESSAGE')).toBe('You are a helper.');
  });

  it('extrae el bloque USER (sin rellenar)', () => {
    const user = extractSection(INLINE_TEMPLATE, 'USER MESSAGE');
    expect(user).toContain('Job: {JD_TEXT}');
    expect(user).toContain('{BULLETS_NUMBERED_LIST}');
  });

  it('retorna string vacío si la sección no existe', () => {
    expect(extractSection(INLINE_TEMPLATE, 'NO EXISTE')).toBe('');
  });
});

describe('fillTailorCvPrompt', () => {
  it('rellena los placeholders con datos reales', () => {
    const { system, user } = fillTailorCvPrompt(INLINE_TEMPLATE, {
      job: mockJobSeniorBackendEN,
      profile: mockProfile,
      bullets: mockBullets,
      lang: 'en',
    });

    expect(system).toBe('You are a helper.');
    expect(user).toContain('TechCorp Spain'); // company del JD
    expect(user).toContain('Daniel Developer'); // fullName
    expect(user).toContain('1. Designed and maintained'); // primer bullet numerado
  });

  it('no deja ningún placeholder sin rellenar', () => {
    const { system, user } = fillTailorCvPrompt(INLINE_TEMPLATE, {
      job: mockJobSeniorBackendEN,
      profile: mockProfile,
      bullets: mockBullets,
      lang: 'en',
    });
    expect(/\{[A-Z_]+\}/.test(system + user)).toBe(false);
  });

  it('agrupa el banco por contenedor: mismo experienceId, mismo [Group N]', () => {
    const { user } = fillTailorCvPrompt(INLINE_TEMPLATE, {
      job: mockJobSeniorBackendEN,
      profile: mockProfile,
      bullets: mockBullets,
      lang: 'en',
    });

    // bullet-002, 004 y 006 (fixture) comparten experienceId 'exp-tech-lead':
    // deben caer bajo el MISMO grupo, en vez de uno por bullet.
    const groups = user.match(/\[Group \d+\]/g);
    expect(groups?.length).toBe(4); // 4 experienceId distintos en el fixture

    // Todo lo que aparece ENTRE dos marcadores de grupo pertenece a ese grupo.
    const secondGroupBlock = user.split(/\[Group \d+\]/)[2];
    expect(secondGroupBlock).toContain('Implemented logging'); // bullet-002
    expect(secondGroupBlock).toContain('Mentored 3 junior developers'); // bullet-004
    expect(secondGroupBlock).toContain('Led refactoring of a 2M line monolith'); // bullet-006
  });
});

describe('fillTailorCoverLetterPrompt + plantilla .txt real', () => {
  it('carga el .txt real y lo rellena sin placeholders huérfanos', () => {
    const template = loadPromptFile('tailor-cover.txt');
    const { system, user } = fillTailorCoverLetterPrompt(template, {
      job: mockJobSeniorBackendEN,
      profile: mockProfile,
      bullets: mockBullets,
      lang: 'es',
    });

    expect(system.length).toBeGreaterThan(0);
    expect(user).toContain('TechCorp Spain');
    expect(/\{[A-Z_]+\}/.test(system + user)).toBe(false);
  });
});
