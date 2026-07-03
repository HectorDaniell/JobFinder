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
import type { DocFormat, DocumentArtifact, DocumentPort } from '../ports/DocumentPort';
import type { LlmPort, TailoredCv } from '../ports/LlmPort';
import { NotFoundError } from '../errors/DomainError';

/**
 * Puerto DEFINIDO POR EL CONSUMIDOR: lo único que el caso de uso necesita para
 * cargar un perfil. `ProfileRepository` (en db) lo satisface estructuralmente,
 * sin que el core dependa de db. Mismo patrón que `BulletProvider` (Sprint 2).
 */
export interface ProfileProvider {
  findById(id: string): Promise<Profile | null>;
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

    // 2. Adaptar contenido con el LLM. CV y carta son independientes entre sí,
    //    así que los pedimos EN PARALELO (ahorra ~la mitad del tiempo de red).
    const [cv, coverLetter] = await Promise.all([
      this.llm.tailorCv(job, profile, lang),
      this.llm.tailorCoverLetter(job, profile, lang),
    ]);

    // 3. Convertir a archivos: un CV y una carta por cada formato pedido.
    //    (La generación es local y rápida; secuencial se lee mejor.)
    const files: DocumentArtifact[] = [];
    for (const format of formats) {
      files.push(await this.documents.generateCv(cv, profile, lang, format));
      files.push(await this.documents.generateCoverLetter(coverLetter, profile, lang, format));
    }

    return { cv, coverLetter, files };
  }
}
