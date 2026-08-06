/**
 * MAPPER del CV: TailoredCv + Profile + Experience[]  →  ResumeModel
 *
 * Es una FUNCIÓN PURA: misma entrada ⇒ misma salida, sin I/O ni efectos
 * secundarios. Aquí se decide UNA sola vez "qué va en el CV"; los exporters
 * solo dibujan. El encabezado se arma con buildHeader (compartido con la carta).
 */

import { Experience, type Profile, type TailoredBullet, type TailoredCv } from '@jobfinder/core';
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
  // Orden de CV: el empleo actual primero, luego por fecha descendente.
  const sortedExperiences = [...experiences].sort(Experience.byMostRecent);

  // Un balde de textos por experiencia (arranca vacío; se llena abajo).
  const bulletsByExperience = new Map<string, string[]>(sortedExperiences.map((e) => [e.id, []]));
  const projects: TailoredBullet[] = [];
  const education: TailoredBullet[] = [];

  for (const bullet of cv.bullets) {
    const bucket = bullet.experienceId && bulletsByExperience.get(bullet.experienceId);
    if (bucket) {
      bucket.push(bullet.text);
    } else if (bullet.category === 'education') {
      education.push(bullet);
    } else {
      // 'project', y cualquier logro sin empleo vinculado que no sea educación.
      projects.push(bullet);
    }
  }

  // TODOS los empleos entran, tengan o no bullets seleccionados. Omitir uno
  // porque el LLM no eligió ningún logro suyo para ESTA vacante abriría un
  // hueco en el historial laboral —lo primero que mira un reclutador— y eso es
  // peor que un encabezado escueto. Dónde trabajaste es un hecho; lo que se
  // adapta a la oferta son los logros que se cuentan debajo.
  const experience: ResumeGroup[] = sortedExperiences.map((exp) => ({
    heading: `${exp.role} — ${exp.company}`,
    meta: formatPeriod(exp.startDate, exp.endDate, lang),
    bullets: bulletsByExperience.get(exp.id) ?? [],
  }));

  return {
    header: buildHeader(profile),
    labels: LABELS[lang],
    summary: lang === 'es' ? profile.summaryEs : profile.summaryEn,
    skills: cv.keywords,
    experience,
    projects: groupByContext(projects),
    education: groupByContext(education),
  };
}

/**
 * Agrupa bullets SIN empleo por su contexto (`sourceRole`), que es lo único que
 * los titula: una tesis, un proyecto personal, una universidad. Es el mismo
 * gesto que agrupar la experiencia por empresa, con el campo que sí tienen.
 *
 * Un Map preserva el orden de aparición, así que respeta la prioridad con la
 * que el LLM los seleccionó. Los que no traen contexto van al final, sueltos:
 * es la única forma honesta de mostrarlos sin inventarles un título.
 */
function groupByContext(bullets: TailoredBullet[]): ResumeGroup[] {
  const byContext = new Map<string, ResumeGroup>();
  const untitled: string[] = [];

  for (const bullet of bullets) {
    if (!bullet.sourceRole) {
      untitled.push(bullet.text);
      continue;
    }
    const group = byContext.get(bullet.sourceRole);
    if (group) {
      group.bullets.push(bullet.text);
    } else {
      byContext.set(bullet.sourceRole, { heading: bullet.sourceRole, bullets: [bullet.text] });
    }
  }

  const groups = [...byContext.values()];
  return untitled.length > 0 ? [...groups, { bullets: untitled }] : groups;
}
