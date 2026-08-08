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
 * el caso de uso lo necesita aparte para garantizar que ningún contenedor del
 * historial quede mudo (ver `withGuaranteedCoverage`).
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
    const cv = withCuratedSkills(
      withGuaranteedCoverage(tailored, bank, experiences, job, lang),
      job
    );

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
 * COBERTURA GARANTIZADA — ningún contenedor del historial queda mudo.
 *
 * El LLM optimiza "los bullets más relevantes para esta vacante", y esa
 * pregunta no es la misma que "el mejor CV para esta vacante". Un CV real
 * nunca omite un trabajo ni lo deja en blanco: dice MENOS de lo menos
 * relevante, nunca nada. Un contenedor (empleo, proyecto o título) es un hecho
 * del candidato — igual que la educación ya lo era antes de esta regla — así
 * que no debería poder desaparecer solo porque para ESTA oferta en concreto no
 * ganó la competencia por relevancia.
 *
 * Por cada contenedor sin ningún bullet seleccionado, se añade
 * DETERMINÍSTICAMENTE el que mejor solapa en skills con la vacante — nunca por
 * el LLM, para no gastar otra llamada ni abrir otra vía de invención. Sigue
 * siendo un bullet REAL del banco: la garantía de "nunca inventa" no se toca.
 *
 * Un contenedor sin ningún bullet en el banco (creado pero aún sin logros
 * cargados) se queda sin línea: no hay nada real que ofrecerle, y esa es una
 * señal correcta para que el usuario complete su banco, no algo que rellenar.
 */
function withGuaranteedCoverage(
  cv: TailoredCv,
  bank: Bullet[],
  experiences: Experience[],
  job: Job,
  lang: 'es' | 'en'
): TailoredCv {
  const covered = new Set(cv.bullets.map((b) => b.experienceId));
  const jd = job.description.toLowerCase();

  const additions: TailoredBullet[] = [];
  for (const exp of experiences) {
    if (covered.has(exp.id)) continue;

    const candidates = bank.filter((b) => b.experienceId === exp.id);
    if (candidates.length === 0) continue;

    const best = candidates.reduce((a, b) => (skillOverlap(b, jd) > skillOverlap(a, jd) ? b : a));
    additions.push({
      text: best.getText(lang),
      category: best.category,
      experienceId: best.experienceId,
      skills: best.skills,
    });
  }

  return additions.length === 0 ? cv : { ...cv, bullets: [...cv.bullets, ...additions] };
}

/** Cuántas skills del bullet aparecen literalmente en la descripción de la vacante. */
function skillOverlap(bullet: Bullet, jobDescriptionLower: string): number {
  return bullet.skills.filter((s) => jobDescriptionLower.includes(s.toLowerCase())).length;
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
