/**
 * MAPPER del CV: TailoredCv + Profile  →  ResumeModel
 *
 * Es una FUNCIÓN PURA: misma entrada ⇒ misma salida, sin I/O ni efectos
 * secundarios. Aquí se decide UNA sola vez "qué va en el CV"; los exporters
 * solo dibujan. El encabezado se arma con buildHeader (compartido con la carta).
 */

import type { Profile, TailoredCv } from '@jobfinder/core';
import type { ResumeModel } from './ResumeModel';
import { buildHeader } from './buildHeader';

/** Tabla de localización de los títulos de sección. */
const LABELS = {
  es: { summary: 'Resumen profesional', skills: 'Habilidades', experience: 'Experiencia' },
  en: { summary: 'Summary', skills: 'Skills', experience: 'Experience' },
} as const;

export function buildResumeModel(
  cv: TailoredCv,
  profile: Profile,
  lang: 'es' | 'en'
): ResumeModel {
  return {
    header: buildHeader(profile),
    labels: LABELS[lang],
    summary: lang === 'es' ? profile.summaryEs : profile.summaryEn,
    skills: cv.keywords,
    experience: cv.bullets,
  };
}
