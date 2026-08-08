/**
 * MAPPER del CV: TailoredCv + Profile + Experience[]  →  ResumeModel
 *
 * Es una FUNCIÓN PURA: misma entrada ⇒ misma salida, sin I/O ni efectos
 * secundarios. Aquí se decide UNA sola vez "qué va en el CV"; los exporters
 * solo dibujan. El encabezado se arma con buildHeader (compartido con la carta).
 */

import { Experience, type Profile, type TailoredCv } from '@jobfinder/core';
import type { ResumeGroup, ResumeModel } from './ResumeModel';
import { buildHeader } from './buildHeader';
import { formatPeriod } from './formatPeriod';

/** Tabla de localización de los títulos de sección. */
const LABELS = {
  es: {
    summary: 'Resumen profesional',
    skills: 'Habilidades',
    experience: 'Experiencia',
    projects: 'Proyectos',
    education: 'Educación',
  },
  en: {
    summary: 'Summary',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
  },
} as const;

export function buildResumeModel(
  cv: TailoredCv,
  profile: Profile,
  experiences: Experience[],
  lang: 'es' | 'en'
): ResumeModel {
  // Un balde de textos por contenedor (arranca vacío; se llena abajo). Todo
  // bullet tiene experienceId, así que ya no hace falta un camino aparte para
  // "sin empleo" — la única pregunta es a qué contenedor pertenece.
  const bulletsByContainer = new Map<string, string[]>(experiences.map((e) => [e.id, []]));
  for (const bullet of cv.bullets) {
    bulletsByContainer.get(bullet.experienceId)?.push(bullet.text);
  }

  return {
    header: buildHeader(profile),
    labels: LABELS[lang],
    summary: lang === 'es' ? profile.summaryEs : profile.summaryEn,
    skills: cv.keywords,
    experience: section('job', experiences, bulletsByContainer, lang),
    projects: section('project', experiences, bulletsByContainer, lang),
    education: section('education', experiences, bulletsByContainer, lang),
  };
}

/**
 * Una sección del CV: todos los contenedores de un `kind`, más reciente
 * primero, cada uno con sus bullets seleccionados debajo.
 *
 * TODOS entran, tengan o no bullets seleccionados para ESTA oferta. Omitir uno
 * abriría un hueco en el historial —lo primero que mira un reclutador— y eso es
 * peor que un encabezado escueto (ADR-0026). La cobertura garantizada
 * (TailorDocuments, ADR-0028) ya intenta que esto rara vez pase; esta sección
 * solo dibuja lo que llegó, no decide si algo falta.
 */
function section(
  kind: Experience['kind'],
  experiences: Experience[],
  bulletsByContainer: Map<string, string[]>,
  lang: 'es' | 'en'
): ResumeGroup[] {
  return experiences
    .filter((exp) => exp.kind === kind)
    .sort(Experience.byMostRecent)
    .map((exp) => ({
      heading: heading(exp),
      meta: meta(exp, lang),
      bullets: bulletsByContainer.get(exp.id) ?? [],
    }));
}

/**
 * "Rol — Empresa" para un empleo, "Título — Institución" para un grado. Si
 * organization y title coinciden (contenedor recién creado desde un dato
 * migrado, aún sin editar — ver migración 0003), se muestra una sola vez en
 * vez de duplicarlo.
 */
function heading(exp: Experience): string {
  return exp.organization === exp.title ? exp.title : `${exp.title} — ${exp.organization}`;
}

/** Período, y si es un proyecto con URL, la URL a continuación. */
function meta(exp: Experience, lang: 'es' | 'en'): string {
  const period = formatPeriod(exp.startDate, exp.endDate, lang);
  return exp.url ? `${period} · ${exp.url}` : period;
}
