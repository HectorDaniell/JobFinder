/**
 * MAPPER: TailoredCv + Profile  →  ResumeModel
 *
 * Es una FUNCIÓN PURA: misma entrada ⇒ misma salida, sin I/O ni efectos
 * secundarios. Por eso es trivial de testear (sin mocks, sin BD, sin red).
 * Aquí se decide UNA sola vez "qué va en el CV"; los exporters solo dibujan.
 */

import type { Profile, TailoredCv } from '@jobfinder/core';
import type { ResumeLink, ResumeModel } from './ResumeModel';

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
    header: {
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      links: buildLinks(profile.links),
    },
    labels: LABELS[lang],
    summary: lang === 'es' ? profile.summaryEs : profile.summaryEn,
    skills: cv.keywords,
    experience: cv.bullets,
  };
}

/**
 * Normaliza el objeto de links del Profile ({ github?, linkedin?, portfolio? })
 * a una LISTA uniforme. Así los exporters iteran una sola colección en vez de
 * preguntar por cada campo opcional. Se omiten los ausentes.
 */
function buildLinks(links: Profile['links']): ResumeLink[] {
  const out: ResumeLink[] = [];
  if (links.github) out.push({ label: 'GitHub', url: links.github });
  if (links.linkedin) out.push({ label: 'LinkedIn', url: links.linkedin });
  if (links.portfolio) out.push({ label: 'Portfolio', url: links.portfolio });
  return out;
}
