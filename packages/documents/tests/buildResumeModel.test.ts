import { describe, it, expect } from 'vitest';
import { buildResumeModel } from '../src/model/buildResumeModel';
import { mockProfile, mockProfileAccents } from './fixtures/profile.mock';
import { mockTailoredCv } from './fixtures/tailoredCv.mock';

describe('buildResumeModel', () => {
  it('localiza los títulos de sección según el idioma', () => {
    expect(buildResumeModel(mockTailoredCv, mockProfile, 'es').labels).toEqual({
      summary: 'Resumen profesional',
      skills: 'Habilidades',
      experience: 'Experiencia',
    });
    expect(buildResumeModel(mockTailoredCv, mockProfile, 'en').labels.experience).toBe(
      'Experience'
    );
  });

  it('elige el resumen del idioma pedido', () => {
    expect(buildResumeModel(mockTailoredCv, mockProfile, 'es').summary).toBe(mockProfile.summaryEs);
    expect(buildResumeModel(mockTailoredCv, mockProfile, 'en').summary).toBe(mockProfile.summaryEn);
  });

  it('copia bullets → experience y keywords → skills del TailoredCv', () => {
    const model = buildResumeModel(mockTailoredCv, mockProfile, 'en');
    expect(model.experience).toEqual(mockTailoredCv.bullets);
    expect(model.skills).toEqual(mockTailoredCv.keywords);
  });

  it('arma el header con los datos de contacto del Profile', () => {
    const { header } = buildResumeModel(mockTailoredCv, mockProfile, 'en');
    expect(header.fullName).toBe('Daniel Developer');
    expect(header.email).toBe(mockProfile.email);
    expect(header.links).toContainEqual({
      label: 'GitHub',
      url: 'https://github.com/danieldev',
    });
  });

  it('normaliza solo los links presentes (omite los ausentes) y el phone opcional', () => {
    const { header } = buildResumeModel(mockTailoredCv, mockProfileAccents, 'en');
    expect(header.links).toEqual([{ label: 'GitHub', url: 'https://github.com/jose' }]);
    expect(header.phone).toBeUndefined();
  });
});
