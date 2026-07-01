/**
 * ADAPTER de documentos: implementa DocumentPort orquestando las piezas del
 * package (mappers + exporters). Es el ÚNICO punto que el mundo exterior
 * (la futura API) necesita conocer; internamente decide qué mapper y qué
 * exporter usar según el `format` pedido, y arma el DocumentArtifact.
 *
 * No recibe dependencias por constructor: sus colaboradores (mappers y
 * exporters) son funciones puras/locales sin efectos secundarios costosos
 * (ni red, ni BD, ni API), así que no hay nada que inyectar ni mockear.
 * Contrasta con el ClaudeAdapter (Sprint 2), que SÍ inyectaba un cliente HTTP
 * y un repositorio porque esos sí tocaban el mundo exterior.
 */

import type {
  DocFormat,
  DocumentArtifact,
  DocumentPort,
  Profile,
  TailoredCv,
} from '@jobfinder/core';

import { buildCoverLetterModel } from './model/buildCoverLetterModel';
import { buildResumeModel } from './model/buildResumeModel';
import { DOCX_MIME, exportCoverLetterToDocx, exportResumeToDocx } from './exporters/docx.exporter';
import { PDF_MIME, exportCoverLetterToPdf, exportResumeToPdf } from './exporters/pdf.exporter';

export class DocumentAdapter implements DocumentPort {
  async generateCv(
    cv: TailoredCv,
    profile: Profile,
    lang: 'es' | 'en',
    format: DocFormat
  ): Promise<DocumentArtifact> {
    const model = buildResumeModel(cv, profile, lang);
    const bytes =
      format === 'pdf' ? await exportResumeToPdf(model) : await exportResumeToDocx(model);
    return this.artifact(bytes, format, this.filename(profile, 'cv', lang, format));
  }

  async generateCoverLetter(
    letter: string,
    profile: Profile,
    lang: 'es' | 'en',
    format: DocFormat
  ): Promise<DocumentArtifact> {
    const model = buildCoverLetterModel(letter, profile);
    const bytes =
      format === 'pdf'
        ? await exportCoverLetterToPdf(model)
        : await exportCoverLetterToDocx(model);
    return this.artifact(bytes, format, this.filename(profile, 'cover', lang, format));
  }

  /** Envuelve los bytes con su MIME y el nombre de archivo sugerido. */
  private artifact(
    bytes: Uint8Array,
    format: DocFormat,
    filename: string
  ): DocumentArtifact {
    return {
      bytes,
      mimeType: format === 'pdf' ? PDF_MIME : DOCX_MIME,
      filename,
    };
  }

  /** Nombre sugerido, p. ej. "daniel-developer-cv-en.pdf". */
  private filename(
    profile: Profile,
    kind: 'cv' | 'cover',
    lang: 'es' | 'en',
    format: DocFormat
  ): string {
    return `${slugify(profile.fullName)}-${kind}-${lang}.${format}`;
  }
}

/** Convierte "José Pérez" → "jose-perez" (seguro para nombre de archivo). */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD') // separa la letra de su acento (é → e + ´)
    .replace(/\p{Diacritic}/gu, '') // borra los acentos ya separados
    .replace(/[^a-z0-9]+/g, '-') // no alfanumérico → guion
    .replace(/^-+|-+$/g, ''); // recorta guiones de los extremos
}
