import { describe, it, expect } from 'vitest';
import {
  PDF_MIME,
  exportCoverLetterToPdf,
  exportResumeToPdf,
} from '../src/exporters/pdf.exporter';
import { buildResumeModel } from '../src/model/buildResumeModel';
import { buildCoverLetterModel } from '../src/model/buildCoverLetterModel';
import { mockProfile } from './fixtures/profile.mock';
import { mockTailoredCv } from './fixtures/tailoredCv.mock';
import { mockCoverLetter } from './fixtures/coverLetter.mock';

/** Un PDF empieza con la firma "%PDF". */
const pdfSignature = (bytes: Uint8Array): string =>
  Buffer.from(bytes.subarray(0, 4)).toString('latin1');

describe('pdf exporter', () => {
  it('exportResumeToPdf genera un PDF válido (firma %PDF, no vacío)', async () => {
    const bytes = await exportResumeToPdf(buildResumeModel(mockTailoredCv, mockProfile, 'en'));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(pdfSignature(bytes)).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('exportCoverLetterToPdf genera un PDF válido (firma %PDF)', async () => {
    const bytes = await exportCoverLetterToPdf(
      buildCoverLetterModel(mockCoverLetter, mockProfile)
    );
    expect(pdfSignature(bytes)).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(500);
  });

  it('expone el MIME oficial de PDF', () => {
    expect(PDF_MIME).toBe('application/pdf');
  });
});
