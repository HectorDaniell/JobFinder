/**
 * EXPORTADOR DOCX (CV y carta)
 *
 * Convierte un modelo neutral al formato en los bytes de un .docx ATS-friendly:
 * una sola columna, sin tablas ni imágenes, texto 100% seleccionable. Usa la
 * librería `docx` (construcción DECLARATIVA: se arma un árbol de párrafos y
 * `Packer` lo serializa).
 */

import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import type { CoverLetterModel } from '../model/CoverLetterModel';
import type { ResumeHeader, ResumeModel } from '../model/ResumeModel';

/** MIME oficial de los .docx (OpenXML). Lo usará el adapter al armar el artifact. */
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Tamaños en HALF-POINTS (docx mide así): 22 = 11pt, 32 = 16pt, 24 = 12pt, 18 = 9pt.
const FONT = 'Calibri';
const SIZE_NAME = 32;
const SIZE_SECTION = 24;
const SIZE_BODY = 22;
const SIZE_CONTACT = 18;

export function exportResumeToDocx(model: ResumeModel): Promise<Uint8Array> {
  return renderToDocx([
    ...headerParagraphs(model.header),
    sectionHeading(model.labels.summary),
    new Paragraph({ children: [run(model.summary)] }),
    sectionHeading(model.labels.skills),
    new Paragraph({ children: [run(model.skills.join(', '))] }),
    sectionHeading(model.labels.experience),
    ...model.experience.map(bulletParagraph),
  ]);
}

export function exportCoverLetterToDocx(model: CoverLetterModel): Promise<Uint8Array> {
  return renderToDocx([
    ...headerParagraphs(model.header),
    ...model.paragraphs.map(
      (p) => new Paragraph({ spacing: { after: 160 }, children: [run(p)] })
    ),
  ]);
}

/**
 * Envuelve el boilerplate común: un Document de una sección con los párrafos
 * dados, serializado a bytes. docx es DECLARATIVO, así que recibe DATOS
 * (los párrafos ya construidos).
 *
 * Packer.toBuffer → Buffer de Node, que YA es un Uint8Array (sin conversión).
 */
function renderToDocx(children: Paragraph[]): Promise<Uint8Array> {
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

/** Helper: un fragmento de texto con fuente/tamaño consistentes. */
function run(text: string, opts: { bold?: boolean; size?: number } = {}): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? SIZE_BODY,
    bold: opts.bold ?? false,
  });
}

/** Nombre centrado + línea de contacto (email · teléfono · links). */
function headerParagraphs(header: ResumeHeader): Paragraph[] {
  const contact = [
    header.email,
    header.phone,
    ...header.links.map((l) => `${l.label}: ${l.url}`),
  ].filter((x): x is string => Boolean(x));

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [run(header.fullName, { bold: true, size: SIZE_NAME })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [run(contact.join('  ·  '), { size: SIZE_CONTACT })],
    }),
  ];
}

/** Título de sección: negrita, un poco más grande, con aire arriba/abajo. */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [run(text, { bold: true, size: SIZE_SECTION })],
  });
}

/** Un bullet real de experiencia (lista nativa, no un "•" tecleado). */
function bulletParagraph(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    children: [run(text)],
  });
}
