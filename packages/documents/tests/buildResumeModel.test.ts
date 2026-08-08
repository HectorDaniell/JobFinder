import { describe, it, expect } from 'vitest';
import { buildResumeModel } from '../src/model/buildResumeModel';
import { mockProfile, mockProfileAccents } from './fixtures/profile.mock';
import { mockTailoredCv } from './fixtures/tailoredCv.mock';
import { mockExperiences, mockExperiencePast } from './fixtures/experiences.mock';

describe('buildResumeModel', () => {
  it('localiza los títulos de sección según el idioma', () => {
    expect(buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'es').labels).toEqual({
      summary: 'Resumen profesional',
      skills: 'Habilidades',
      experience: 'Experiencia',
      projects: 'Proyectos',
      education: 'Educación',
    });
    expect(
      buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en').labels.experience
    ).toBe('Experience');
  });

  it('elige el resumen del idioma pedido', () => {
    expect(buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'es').summary).toBe(
      mockProfile.summaryEs
    );
    expect(buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en').summary).toBe(
      mockProfile.summaryEn
    );
  });

  it('agrupa los bullets por empresa, con el empleo actual primero', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');

    expect(model.experience).toHaveLength(2);
    expect(model.experience[0].heading).toBe('Senior Backend Engineer — Acme Corp');
    expect(model.experience[0].bullets).toHaveLength(2);
    expect(model.experience[0].meta).toContain('Present'); // sin endDate

    expect(model.experience[1].heading).toBe('Backend Developer — Previous Inc');
    expect(model.experience[1].bullets).toHaveLength(1);
    expect(model.experience[1].meta).toBe('Jun 2021 – Dec 2023');
  });

  it('agrupa Proyectos bajo su contenedor real (varios bullets, un solo bloque)', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');

    expect(model.projects).toHaveLength(1);
    expect(model.projects[0].heading).toBe('Open source CLI — Side project');
    expect(model.projects[0].bullets).toEqual([
      'Built an open-source CLI tool for scaffolding NestJS projects.',
      'Published it to npm, reaching 2k weekly downloads.',
    ]);
  });

  it('muestra la URL de un proyecto junto al período', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');
    expect(model.projects[0].meta).toContain('https://github.com/danieldev/cli');
  });

  it('agrupa Educación bajo su contenedor real', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');

    expect(model.education).toHaveLength(1);
    expect(model.education[0].heading).toBe('Distributed systems design certification — Coursera');
    expect(model.education[0].bullets).toEqual([
      'Completed a certification in distributed systems design.',
    ]);
  });

  it('MANTIENE un empleo sin bullets seleccionados (no abrir huecos en el historial)', () => {
    // Simula que Claude no eligió nada de "Previous Inc" para este JD en concreto.
    // El empleo sigue en el CV: omitirlo dejaría un hueco de fechas sin explicar.
    const cvSinEmpleoPasado = {
      ...mockTailoredCv,
      bullets: mockTailoredCv.bullets.filter((b) => b.experienceId !== mockExperiencePast.id),
    };
    const model = buildResumeModel(cvSinEmpleoPasado, mockProfile, mockExperiences, 'en');

    expect(model.experience).toHaveLength(2);
    expect(model.experience[1].heading).toContain('Previous Inc');
    expect(model.experience[1].bullets).toEqual([]);
  });

  it('copia keywords → skills del TailoredCv', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');
    expect(model.skills).toEqual(mockTailoredCv.keywords);
  });

  it('arma el header con los datos de contacto del Profile', () => {
    const { header } = buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en');
    expect(header.fullName).toBe('Daniel Developer');
    expect(header.email).toBe(mockProfile.email);
    expect(header.links).toContainEqual({
      label: 'GitHub',
      url: 'https://github.com/danieldev',
    });
  });

  it('normaliza solo los links presentes (omite los ausentes) y el phone opcional', () => {
    const { header } = buildResumeModel(mockTailoredCv, mockProfileAccents, mockExperiences, 'en');
    expect(header.links).toEqual([{ label: 'GitHub', url: 'https://github.com/jose' }]);
    expect(header.phone).toBeUndefined();
  });
});
