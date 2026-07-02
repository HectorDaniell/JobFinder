import { describe, it, expect } from 'vitest';
import { DocumentAdapter } from '../src/adapter';
import { mockProfile, mockProfileAccents } from './fixtures/profile.mock';
import { mockTailoredCv } from './fixtures/tailoredCv.mock';
import { mockCoverLetter } from './fixtures/coverLetter.mock';

/** Lee los primeros n bytes como texto (para comprobar la firma del formato). */
const sig = (bytes: Uint8Array, n: number): string =>
  Buffer.from(bytes.subarray(0, n)).toString('latin1');

describe('DocumentAdapter', () => {
  const adapter = new DocumentAdapter();

  it('generateCv en PDF arma el artifact completo (bytes + mime + filename)', async () => {
    const art = await adapter.generateCv(mockTailoredCv, mockProfile, 'en', 'pdf');
    expect(art.mimeType).toBe('application/pdf');
    expect(art.filename).toBe('daniel-developer-cv-en.pdf');
    expect(sig(art.bytes, 4)).toBe('%PDF');
  });

  it('generateCv en DOCX arma el artifact completo', async () => {
    const art = await adapter.generateCv(mockTailoredCv, mockProfile, 'es', 'docx');
    expect(art.mimeType).toContain('wordprocessingml');
    expect(art.filename).toBe('daniel-developer-cv-es.docx');
    expect(sig(art.bytes, 2)).toBe('PK');
  });

  it('generateCoverLetter en PDF arma el artifact', async () => {
    const art = await adapter.generateCoverLetter(mockCoverLetter, mockProfile, 'en', 'pdf');
    expect(art.filename).toBe('daniel-developer-cover-en.pdf');
    expect(sig(art.bytes, 4)).toBe('%PDF');
  });

  it('generateCoverLetter en DOCX arma el artifact', async () => {
    const art = await adapter.generateCoverLetter(mockCoverLetter, mockProfile, 'es', 'docx');
    expect(art.mimeType).toContain('wordprocessingml');
    expect(art.filename).toBe('daniel-developer-cover-es.docx');
    expect(sig(art.bytes, 2)).toBe('PK');
  });

  it('slugifica nombres con acentos en el filename', async () => {
    const art = await adapter.generateCv(mockTailoredCv, mockProfileAccents, 'en', 'pdf');
    expect(art.filename).toBe('jose-ramirez-nunez-cv-en.pdf');
  });
});
