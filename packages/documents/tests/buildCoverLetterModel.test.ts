import { describe, it, expect } from 'vitest';
import { buildCoverLetterModel } from '../src/model/buildCoverLetterModel';
import { mockProfile } from './fixtures/profile.mock';
import { mockCoverLetter } from './fixtures/coverLetter.mock';

describe('buildCoverLetterModel', () => {
  it('parte el texto en párrafos por las líneas en blanco', () => {
    const model = buildCoverLetterModel(mockCoverLetter, mockProfile);
    expect(model.paragraphs).toHaveLength(5);
    expect(model.paragraphs[0]).toBe('Dear Hiring Manager,');
  });

  it('colapsa los saltos simples internos (ningún párrafo contiene \\n)', () => {
    const model = buildCoverLetterModel(mockCoverLetter, mockProfile);
    for (const paragraph of model.paragraphs) {
      expect(paragraph).not.toContain('\n');
    }
    // el último párrafo tenía "Sincerely,\nDaniel Developer"
    expect(model.paragraphs.at(-1)).toBe('Sincerely, Daniel Developer');
  });

  it('ignora los párrafos vacíos', () => {
    const model = buildCoverLetterModel('Uno\n\n\n\nDos', mockProfile);
    expect(model.paragraphs).toEqual(['Uno', 'Dos']);
  });

  it('reutiliza el header del remitente (mismo builder que el CV)', () => {
    const model = buildCoverLetterModel(mockCoverLetter, mockProfile);
    expect(model.header.fullName).toBe('Daniel Developer');
    expect(model.header.email).toBe(mockProfile.email);
  });
});
