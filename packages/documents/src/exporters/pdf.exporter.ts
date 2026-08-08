/**
 * EXPORTADOR PDF (CV y carta)
 *
 * Convierte un modelo neutral al formato en los bytes de un PDF ATS-friendly:
 * una sola columna, texto seleccionable, fuentes estándar (Helvetica).
 *
 * A diferencia de `docx`, `pdfkit` es un STREAM IMPERATIVO: se dibuja de arriba
 * hacia abajo y los bytes se recolectan por eventos. Por eso renderToPdf recibe
 * un CALLBACK (comportamiento: "cómo dibujar"), no datos ya construidos.
 */

import PDFDocument from 'pdfkit';
import type { CoverLetterModel } from '../model/CoverLetterModel';
import type { ResumeGroup, ResumeHeader, ResumeModel } from '../model/ResumeModel';

/** MIME oficial de los PDF. Lo usará el adapter al armar el artifact. */
export const PDF_MIME = 'application/pdf';

// Tamaños en PUNTOS (pdfkit mide en pt directamente, no en half-points como docx).
const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';
const SIZE_NAME = 18;
const SIZE_SECTION = 12;
const SIZE_BODY = 10;
const SIZE_CONTACT = 9;

export function exportResumeToPdf(model: ResumeModel): Promise<Uint8Array> {
  return renderToPdf((doc) => {
    drawHeader(doc, model.header);

    sectionTitle(doc, model.labels.summary);
    doc.font(FONT).fontSize(SIZE_BODY).text(model.summary);

    sectionTitle(doc, model.labels.skills);
    doc.font(FONT).fontSize(SIZE_BODY).text(model.skills.join(', '));

    // Las tres secciones agrupadas se dibujan igual: un encabezado por bloque
    // con sus bullets debajo. Cada una se omite si no tiene ningún bloque.
    drawSection(doc, model.labels.experience, model.experience);
    drawSection(doc, model.labels.projects, model.projects);
    drawSection(doc, model.labels.education, model.education);
  });
}

export function exportCoverLetterToPdf(model: CoverLetterModel): Promise<Uint8Array> {
  return renderToPdf((doc) => {
    drawHeader(doc, model.header);
    doc.moveDown(1);
    doc.font(FONT).fontSize(SIZE_BODY);
    for (const paragraph of model.paragraphs) {
      doc.text(paragraph, { align: 'left', paragraphGap: 8 });
    }
  });
}

/**
 * Envuelve el ciclo de vida del stream de pdfkit: crea el documento, recolecta
 * los chunks y resuelve con el Buffer al cerrar. Recibe un CALLBACK `draw`
 * porque pdfkit es imperativo: le pasamos CÓMO dibujar sobre el documento.
 */
function renderToPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    draw(doc);

    // Cierra el stream → dispara el evento 'end' → resuelve la Promise.
    doc.end();
  });
}

/** Nombre (grande, centrado) + línea de contacto centrada. */
function drawHeader(doc: PDFKit.PDFDocument, header: ResumeHeader): void {
  doc.font(FONT_BOLD).fontSize(SIZE_NAME).text(header.fullName, { align: 'center' });

  const contact = [
    header.email,
    header.phone,
    ...header.links.map((l) => `${l.label}: ${l.url}`),
  ].filter((x): x is string => Boolean(x));

  doc.font(FONT).fontSize(SIZE_CONTACT).text(contact.join('  ·  '), { align: 'center' });
}

/** Aire + título de sección en negrita (el contenido lo dibuja quien llama). */
function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(1);
  doc.font(FONT_BOLD).fontSize(SIZE_SECTION).text(title);
  doc.moveDown(0.3);
}

/**
 * Lista de viñetas real (no "•" tecleado), con el espaciado estándar del CV.
 * Con la lista vacía no dibuja nada: pdfkit deja un hueco por una lista sin
 * elementos, y un empleo sin logros seleccionados es un caso normal.
 */
function bulletList(doc: PDFKit.PDFDocument, items: string[]): void {
  if (items.length === 0) return;
  doc.font(FONT).fontSize(SIZE_BODY).list(items, {
    listType: 'bullet',
    bulletRadius: 1.5,
    textIndent: 12,
    lineGap: 2,
    paragraphGap: 4,
  });
}

/** Una sección agrupada (Experiencia, Proyectos, Educación). Se omite si va vacía. */
function drawSection(doc: PDFKit.PDFDocument, title: string, groups: ResumeGroup[]): void {
  if (groups.length === 0) return;
  sectionTitle(doc, title);
  for (const group of groups) {
    drawGroup(doc, group);
  }
}

/** Un bloque: encabezado en negrita, línea gris del período, y sus bullets. */
function drawGroup(doc: PDFKit.PDFDocument, group: ResumeGroup): void {
  doc.moveDown(0.5);
  doc.font(FONT_BOLD).fontSize(SIZE_BODY).text(group.heading);
  doc.font(FONT).fontSize(SIZE_CONTACT).fillColor('#555555').text(group.meta);
  doc.fillColor('black'); // pdfkit no resetea el color solo: hay que devolverlo.
  doc.moveDown(0.2);
  bulletList(doc, group.bullets);
}
