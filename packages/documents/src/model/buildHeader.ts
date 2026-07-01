/**
 * Construcción del ENCABEZADO de contacto — COMPARTIDO por el CV y la carta.
 *
 * Extraído de buildResumeModel para no duplicar la lógica: tanto el CV como la
 * carta de presentación llevan el mismo bloque (nombre + email + teléfono +
 * links). Función pura.
 */

import type { Profile } from '@jobfinder/core';
import type { ResumeHeader, ResumeLink } from './ResumeModel';

export function buildHeader(profile: Profile): ResumeHeader {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    links: buildLinks(profile.links),
  };
}

/**
 * Normaliza el objeto de links del Profile ({ github?, linkedin?, portfolio? })
 * a una LISTA uniforme, omitiendo los ausentes. Así los exporters iteran una
 * sola colección en vez de preguntar por cada campo opcional.
 */
function buildLinks(links: Profile['links']): ResumeLink[] {
  const out: ResumeLink[] = [];
  if (links.github) out.push({ label: 'GitHub', url: links.github });
  if (links.linkedin) out.push({ label: 'LinkedIn', url: links.linkedin });
  if (links.portfolio) out.push({ label: 'Portfolio', url: links.portfolio });
  return out;
}
