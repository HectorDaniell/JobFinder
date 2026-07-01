/**
 * MODELO INTERMEDIO DE LA CARTA (neutral al formato)
 *
 * Mucho más simple que el CV: solo el encabezado del remitente (reutiliza
 * ResumeHeader) y el cuerpo partido en párrafos. No hay secciones ni labels
 * porque la carta ya viene REDACTADA por el LLM en el idioma correcto; aquí
 * solo se le da formato de archivo.
 */

import type { ResumeHeader } from './ResumeModel';

export interface CoverLetterModel {
  header: ResumeHeader;
  paragraphs: string[];
}
