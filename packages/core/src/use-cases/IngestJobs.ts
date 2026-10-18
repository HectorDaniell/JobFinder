import { randomUUID } from 'node:crypto';
import { Job } from '../domain/entities/Job';
import type { JobSourcePort, RawJob } from '../ports/JobSourcePort';

/**
 * Puerto DEFINIDO POR EL CONSUMIDOR:
 * Lo que IngestJobs necesita de la persistencia para almacenar y deduplicar.
 * `JobRepository` (en @jobfinder/db) lo satisface estructuralmente sin acoplar
 * el core a la base de datos.
 */
export interface JobStore {
  create(job: Job): Promise<Job>;
  findByDedupHash(dedupHash: string): Promise<Job | null>;
}

export interface IngestInput {
  source: JobSourcePort;
  since: Date;
}

export interface IngestReport {
  sourceName: string;
  totalFetched: number;
  ingested: number;
  duplicates: number;
  jobs: Job[];
}

/**
 * CASO DE USO: IngestJobs
 *
 * Orquesta la Etapa 1 y 2 del pipeline (Descubrimiento + Normalización/Dedup):
 * 1. Obtiene las vacantes crudas de una fuente dada (correo, API, etc.).
 * 2. Deduplica contra la base de datos usando el hash normalizado (empresa + título + ubicación).
 * 3. Persiste únicamente las vacantes nuevas como entidades Job (delgadas si no traen descripción).
 * 4. Devuelve un reporte métrico con lo descubierto, ingerido y duplicado.
 */
export class IngestJobs {
  constructor(private readonly jobStore: JobStore) {}

  async execute(input: IngestInput): Promise<IngestReport> {
    const { source, since } = input;

    const rawJobs: RawJob[] = await source.fetch(since);

    let ingestedCount = 0;
    let duplicatesCount = 0;
    const newJobs: Job[] = [];

    for (const raw of rawJobs) {
      const dedupHash = Job.generateDedupHash(raw.company, raw.title, raw.location || '');

      // Comprobar si ya existe una vacante equivalente en la base de datos
      const existing = await this.jobStore.findByDedupHash(dedupHash);
      if (existing) {
        duplicatesCount++;
        continue;
      }

      const now = new Date();
      const job = new Job({
        id: randomUUID(),
        sourceId: source.name,
        externalId: raw.externalId,
        title: raw.title,
        company: raw.company,
        location: raw.location,
        modality: 'unknown',
        seniority: 'unknown',
        description: raw.description,
        url: raw.url,
        postedAt: raw.postedAt,
        raw: raw.raw || {},
        dedupHash,
        enrichmentFailed: false,
        ingestedAt: now,
      });

      const saved = await this.jobStore.create(job);
      newJobs.push(saved);
      ingestedCount++;
    }

    return {
      sourceName: source.name,
      totalFetched: rawJobs.length,
      ingested: ingestedCount,
      duplicates: duplicatesCount,
      jobs: newJobs,
    };
  }
}
