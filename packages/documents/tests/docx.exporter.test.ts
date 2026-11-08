import { describe, it, expect } from 'vitest';
import {
  DOCX_MIME,
  exportCoverLetterToDocx,
  exportResumeToDocx,
} from '../src/exporters/docx.exporter';
import { buildResumeModel } from '../src/model/buildResumeModel';
import { buildCoverLetterModel } from '../src/model/buildCoverLetterModel';
import { mockProfile } from './fixtures/profile.mock';
import { mockTailoredCv } from './fixtures/tailoredCv.mock';
import { mockExperiences } from './fixtures/experiences.mock';
import { mockCoverLetter } from './fixtures/coverLetter.mock';

/** Un .docx es un ZIP → sus bytes empiezan con la firma "PK". */
const zipSignature = (bytes: Uint8Array): string =>
  Buffer.from(bytes.subarray(0, 2)).toString('latin1');

describe('docx exporter', () => {
  it('exportResumeToDocx genera un .docx válido (firma PK, no vacío)', async () => {
    const bytes = await exportResumeToDocx(
      buildResumeModel(mockTailoredCv, mockProfile, mockExperiences, 'en')
    );
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(zipSignature(bytes)).toBe('PK');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('exportCoverLetterToDocx genera un .docx válido (firma PK, no vacío)', async () => {
    const bytes = await exportCoverLetterToDocx(
      buildCoverLetterModel(mockCoverLetter, mockProfile)
    );
    expect(zipSignature(bytes)).toBe('PK');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('expone el MIME oficial de .docx', () => {
    expect(DOCX_MIME).toContain('wordprocessingml');
  });
});
