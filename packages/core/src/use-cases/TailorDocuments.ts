/**
 * CASO DE USO: TailorDocuments
 *
 * Orquesta el flujo estrella de la Fase 1: dado un perfil y una vacante, adapta
 * el CV y la carta (LlmPort) y los convierte en archivos descargables
 * (DocumentPort). Vive en el CORE y es agnóstico al framework: depende solo de
 * puertos, así que se prueba con dobles y lo puede invocar la API o el worker.
 */

import type { Job } from '../domain/entities/Job';
import type { Profile } from '../domain/entities/Profile';
import type { Experience } from '../domain/entities/Experience';
import type { Bullet } from '../domain/entities/Bullet';
import type { DocFormat, DocumentArtifact, DocumentPort } from '../ports/DocumentPort';
import type { LlmPort, TailoredBullet, TailoredCv } from '../ports/LlmPort';
import { NotFoundError } from '../errors/DomainError';

/**
 * Puerto DEFINIDO POR EL CONSUMIDOR: lo único que el caso de uso necesita para
 * cargar un perfil. `ProfileRepository` (en db) lo satisface estructuralmente,
 * sin que el core dependa de db. Mismo patrón que `BulletProvider` (Sprint 2).
 */
export interface ProfileProvider {
  findById(id: string): Promise<Profile | null>;
}

/**
 * Igual patrón para las experiencias: solo lo que hace falta para agrupar el
 * CV. `ExperienceRepository` (db) lo cumple estructuralmente.
 */
export interface ExperienceProvider {
  findByProfileId(profileId: string): Promise<Experience[]>;
}

/**
 * El banco de bullets del perfil. El LLM ya lo usa por dentro para SELECCIONAR;
 * el caso de uso lo necesita aparte para las partes del CV que NO se adaptan a
 * la vacante (hoy: la educación, ver `withEducation`).
 */
export interface BulletProvider {
  findByProfileId(profileId: string): Promise<Bullet[]>;
}

export interface TailorInput {
  profileId: string;
  job: Job;
  lang: 'es' | 'en';
  formats: DocFormat[]; // p. ej. ['pdf'] o ['pdf', 'docx']
}

export interface TailorResult {
  cv: TailoredCv;
  coverLetter: string;
  files: DocumentArtifact[]; // un CV y una carta por cada formato pedido
}

export class TailorDocuments {
  constructor(
    private readonly profiles: ProfileProvider,
    private readonly experiences: ExperienceProvider,
    private readonly bullets: BulletProvider,
    private readonly llm: LlmPort,
    private readonly documents: DocumentPort
  ) {}

  async execute(input: TailorInput): Promise<TailorResult> {
    const { profileId, job, lang, formats } = input;

    // 1. Cargar el perfil (o fallar con un error de dominio tipado → 404).
    const profile = await this.profiles.findById(profileId);
    if (!profile) {
      throw new NotFoundError('Profile', profileId);
    }

    // 2. Adaptar contenido con el LLM + cargar experiencias y banco de bullets.
    //    Las cuatro llamadas son independientes entre sí → EN PARALELO.
    const [tailored, coverLetter, experiences, bank] = await Promise.all([
      this.llm.tailorCv(job, profile, lang),
      this.llm.tailorCoverLetter(job, profile, lang),
      this.experiences.findByProfileId(profileId),
      this.bullets.findByProfileId(profileId),
    ]);

    // 3. Componer el CV final. Lo que el LLM devuelve es la parte ADAPTADA a la
    //    vacante; el resto son reglas de negocio del CV, y por eso viven aquí
    //    en el caso de uso y no en el adapter de documentos.
    const cv = withCuratedSkills(withEducation(tailored, bank, lang), job);

    // 4. Convertir a archivos: un CV y una carta por cada formato pedido.
    //    (La generación es local y rápida; secuencial se lee mejor.)
    const files: DocumentArtifact[] = [];
    for (const format of formats) {
      files.push(await this.documents.generateCv(cv, profile, experiences, lang, format));
      files.push(await this.documents.generateCoverLetter(coverLetter, profile, lang, format));
    }

    return { cv, coverLetter, files };
  }
}

/**
 * Garantiza que la formación esté SIEMPRE en el CV, la haya seleccionado el LLM
 * o no. Un título es un hecho del candidato, no un argumento que compita por
 * relevancia con la vacante: si se filtra, el CV sale sin estudios y parece
 * incompleto. Se añaden solo los que falten, para no duplicar los que el LLM ya
 * eligió (y reformuló).
 */
function withEducation(cv: TailoredCv, bank: Bullet[], lang: 'es' | 'en'): TailoredCv {
  const alreadyIn = cv.bullets.some((b) => b.category === 'education');
  if (alreadyIn) return cv;

  const education: TailoredBullet[] = bank
    .filter((b) => b.category === 'education')
    .map((b) => ({
      text: b.getText(lang),
      category: b.category,
      experienceId: b.experienceId,
      sourceRole: b.sourceRole,
      skills: b.skills,
    }));

  return education.length === 0 ? cv : { ...cv, bullets: [...cv.bullets, ...education] };
}

/** Tope de la línea de habilidades: más allá deja de leerse y pasa a ser ruido. */
const MAX_SKILLS = 15;

/**
 * Sustituye las keywords del LLM por las skills que el usuario CURÓ en su banco.
 *
 * El LLM extrae keywords leyendo la oferta, y salen frases ("arquitectura
 * frontend", "buenas prácticas") que no funcionan en la sección de habilidades
 * de un CV, donde se esperan nombres de tecnología. Las etiquetas del banco ya
 * son eso, y además son del usuario: nadie las inventó.
 *
 * Solo entran las skills de los bullets SELECCIONADOS, así que la línea respalda
 * exactamente lo que el CV afirma. Orden: primero las que aparecen literalmente
 * en la oferta, luego las que sostienen más bullets; y a igualdad, el orden en
 * que aparecen en el CV —que es el de prioridad que les dio el LLM—. Desempatar
 * por alfabeto sería peor: al recortar a MAX_SKILLS, el corte dependería de la
 * inicial en vez de la relevancia.
 *
 * Si el banco no tuviera ninguna etiqueta, se conservan las del LLM: es mejor
 * eso que un CV sin sección de habilidades.
 */
function withCuratedSkills(cv: TailoredCv, job: Job): TailoredCv {
  const jd = job.description.toLowerCase();

  // Clave en minúsculas para colapsar duplicados de mayúsculas ("WordPress" y
  // "Wordpress" son la misma skill); se muestra la primera grafía que apareció.
  const byKey = new Map<string, { label: string; uses: number }>();
  for (const bullet of cv.bullets) {
    for (const skill of bullet.skills) {
      const key = skill.toLowerCase();
      const found = byKey.get(key);
      if (found) found.uses++;
      else byKey.set(key, { label: skill, uses: 1 });
    }
  }

  // El Map ya viene en orden de aparición en el CV, y Array.sort es estable
  // (ES2019+): los empates conservan ese orden sin tener que codificarlo.
  const skills = [...byKey.entries()]
    .sort(([keyA, a], [keyB, b]) => {
      const relevance = Number(jd.includes(keyB)) - Number(jd.includes(keyA));
      return relevance !== 0 ? relevance : b.uses - a.uses;
    })
    .slice(0, MAX_SKILLS)
    .map(([, entry]) => entry.label);

  return skills.length === 0 ? cv : { ...cv, keywords: skills };
}
