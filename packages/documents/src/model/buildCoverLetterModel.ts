/**
 * MAPPER de la carta: texto del LLM + Profile  →  CoverLetterModel
 *
 * Función pura. Arma el encabezado del remitente (buildHeader) y parte el
 * cuerpo en párrafos. NO recibe `lang`: la carta ya viene redactada en el
 * idioma correcto por el LLM, y el encabezado no depende del idioma.
 */

import type { Profile } from '@jobfinder/core';
import type { CoverLetterModel } from './CoverLetterModel';
import { buildHeader } from './buildHeader';

export function buildCoverLetterModel(letter: string, profile: Profile): CoverLetterModel {
  return {
    header: buildHeader(profile),
    paragraphs: splitParagraphs(letter),
  };
}

/**
 * Parte el texto en párrafos: los bloques separados por una línea en blanco.
 * Dentro de cada párrafo colapsa los saltos simples a espacios, para que el
 * exporter maneje el ajuste de línea según el ancho de la página.
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter((p) => p.length > 0);
}
