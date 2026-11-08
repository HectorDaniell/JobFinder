/**
 * PROMPT LOADER — convierte una plantilla .txt en {system, user} listos para Claude
 *
 * Los prompts viven como .txt (versionables, editables sin recompilar). Este
 * módulo los "rellena": lee el archivo, extrae las secciones SYSTEM/USER y
 * sustituye los placeholders ({JD_TEXT}, {BULLETS_NUMBERED_LIST}, ...) por
 * datos reales del Job/Profile/Bullets.
 *
 * Separamos a propósito:
 *  - extractSection / fillPlaceholders → PURAS (sin disco) → fáciles de testear
 *  - loadPromptFile → la única que toca el sistema de archivos
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Job, Profile, Bullet } from '@jobfinder/core';
import { PromptFileNotFoundError } from './errors';

/** Carpeta donde viven los .txt, relativa a este módulo (CJS: __dirname). */
const PROMPTS_DIR = join(__dirname, 'prompts');

/**
 * Lee una plantilla .txt del directorio de prompts.
 *
 * Traducimos el ENOENT crudo a un error de dominio tipado: si los .txt no se
 * copiaron al dist, el fallo se ve como un 500 con causa explicable en vez de
 * un "Internal server error" mudo.
 */
export function loadPromptFile(fileName: string): string {
  const path = join(PROMPTS_DIR, fileName);
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    throw new PromptFileNotFoundError(fileName, path);
  }
}

/**
 * Extrae el texto de una sección delimitada por `===== MARCADOR =====`.
 * Captura desde el marcador hasta el siguiente `=====` (o el fin del archivo).
 */
export function extractSection(raw: string, marker: string): string {
  const re = new RegExp(`=====\\s*${marker}\\s*=====\\s*([\\s\\S]*?)(?:\\n=====|$)`, 'i');
  const match = raw.match(re);
  return match ? match[1].trim() : '';
}

/** Reemplaza cada {KEY} por su valor. Usa split/join para evitar regex frágil. */
function fillPlaceholders(text: string, values: Record<string, string>): string {
  let out = text;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

/** Datos necesarios para armar cualquiera de los prompts (cv o carta). */
export interface PromptVars {
  job: Job;
  profile: Profile;
  bullets: Bullet[];
  lang: 'es' | 'en';
}

/** Valores comunes a todos los prompts (JD, nombre, idioma, resumen). */
function baseValues(job: Job, profile: Profile, lang: 'es' | 'en'): Record<string, string> {
  return {
    JD_TEXT: `${job.title} — ${job.company}\n\n${job.description}`,
    FULL_NAME: profile.fullName,
    LANG: lang,
    SUMMARY: lang === 'es' ? profile.summaryEs : profile.summaryEn,
  };
}

/**
 * Arma el prompt de tailorCv. Extrae SYSTEM/USER y rellena, añadiendo el banco
 * de bullets numerado (la operación SELECCIONA de esa lista).
 *
 * Nota: la temperatura está documentada en el .txt pero NO se parsea de ahí;
 * el adapter la fija explícitamente en código (más robusto que leerla del texto).
 */
export function fillTailorCvPrompt(
  template: string,
  vars: PromptVars
): { system: string; user: string } {
  const { job, profile, bullets, lang } = vars;
  const values: Record<string, string> = {
    ...baseValues(job, profile, lang),
    BULLETS_NUMBERED_LIST: formatBulletBank(bullets, lang),
  };
  return {
    system: fillPlaceholders(extractSection(template, 'SYSTEM MESSAGE'), values),
    user: fillPlaceholders(extractSection(template, 'USER MESSAGE'), values),
  };
}

/**
 * Agrupa el banco por contenedor (`bullet.experienceId`) antes de numerarlo, con
 * una etiqueta ANÓNIMA por grupo — este módulo no conoce el nombre de la empresa
 * ni del proyecto, eso vive en `Experience` (packages/core), que aquí no hace
 * falta importar solo para etiquetar.
 *
 * El propósito no es identificar la empresa: es que Claude VEA dónde empieza y
 * termina cada rol, para que la guía del prompt de "repartir la selección"
 * (v1.2) sea algo que pueda seguir, en vez de una instrucción sin forma de
 * cumplirse sobre una lista plana sin límites visibles.
 */
function formatBulletBank(bullets: Bullet[], lang: 'es' | 'en'): string {
  const order: string[] = [];
  const byGroup = new Map<string, Bullet[]>();
  for (const bullet of bullets) {
    if (!byGroup.has(bullet.experienceId)) {
      order.push(bullet.experienceId);
      byGroup.set(bullet.experienceId, []);
    }
    byGroup.get(bullet.experienceId)?.push(bullet);
  }

  let n = 0;
  const lines: string[] = [];
  order.forEach((id, i) => {
    lines.push(`[Group ${i + 1}]`);
    for (const bullet of byGroup.get(id) ?? []) {
      n++;
      lines.push(`${n}. ${bullet.getText(lang)}`);
    }
  });
  return lines.join('\n');
}

/**
 * Arma el prompt de tailorCoverLetter. Igual que el de CV, pero los bullets se
 * pasan como un RESUMEN de skills/logros (la carta los menciona, no los lista).
 */
export function fillTailorCoverLetterPrompt(
  template: string,
  vars: PromptVars
): { system: string; user: string } {
  const { job, profile, bullets, lang } = vars;
  const values: Record<string, string> = {
    ...baseValues(job, profile, lang),
    BULLETS_SUMMARY: bullets.map((b) => `- ${b.getText(lang)}`).join('\n'),
  };
  return {
    system: fillPlaceholders(extractSection(template, 'SYSTEM MESSAGE'), values),
    user: fillPlaceholders(extractSection(template, 'USER MESSAGE'), values),
  };
}
