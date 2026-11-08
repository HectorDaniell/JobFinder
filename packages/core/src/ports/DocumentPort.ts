/**
 * Port: abstraction for rendering tailored content into downloadable files.
 * Implementations are in packages/documents (e.g., a pdfkit + docx adapter).
 */

import { Profile } from '../domain/entities/Profile';
import { Experience } from '../domain/entities/Experience';
import { TailoredCv } from './LlmPort';

/** Output file formats supported by the document generator. */
export type DocFormat = 'pdf' | 'docx';

/**
 * A generated document: the raw bytes plus the metadata needed to serve it
 * (HTTP download) or persist it (file/DB).
 *
 * `bytes` is a Uint8Array (not Node's Buffer) so the core stays
 * framework-agnostic; a Node Buffer already *is* a Uint8Array, so adapters
 * return theirs without conversion.
 */
export interface DocumentArtifact {
  bytes: Uint8Array;
  mimeType: string; // e.g. 'application/pdf'
  filename: string; // suggested name, e.g. 'daniel-developer-cv-en.pdf'
  /** Which document this is. Lets a UI label it without parsing the filename. */
  kind: 'cv' | 'cover';
}

export interface DocumentPort {
  /**
   * Render a tailored CV into a downloadable file (PDF or DOCX).
   * Consumes the TailoredCv produced by LlmPort.tailorCv, grouping its
   * bullets under the matching entry in `experiences` (company, role, dates)
   * via each bullet's `experienceId`.
   */
  generateCv(
    cv: TailoredCv,
    profile: Profile,
    experiences: Experience[],
    lang: 'es' | 'en',
    format: DocFormat
  ): Promise<DocumentArtifact>;

  /**
   * Render a cover letter into a downloadable file (PDF or DOCX).
   * Consumes the already-written text produced by LlmPort.tailorCoverLetter;
   * this port only deals with the file format, not the wording.
   */
  generateCoverLetter(
    letter: string,
    profile: Profile,
    lang: 'es' | 'en',
    format: DocFormat
  ): Promise<DocumentArtifact>;
}
