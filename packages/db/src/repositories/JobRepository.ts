import { eq, desc } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Job } from '@jobfinder/core';
import * as schema from '../schema';

type DbJob = typeof schema.job.$inferSelect;
type DbJobInsert = typeof schema.job.$inferInsert;

export class JobRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  /* Inserta Job en BD, retorna Job mapeado */
  async create(job: Job): Promise<Job> {
    const dbInsert: DbJobInsert = {
      id: job.id,
      sourceId: job.sourceId,
      externalId: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      modality: job.modality,
      seniority: job.seniority,
      description: job.description,
      url: job.url,
      postedAt: job.postedAt,
      salary: job.salary as unknown as Record<string, unknown>,
      raw: job.raw as unknown as Record<string, unknown>,
      dedupHash: job.dedupHash,
    };

    const inserted = await this.db
      .insert(schema.job)
      .values(dbInsert)
      .returning();

    return this.mapFromDb(inserted[0]);
  }

  /* Carga Job por ID, retorna entidad dominio */
  async findById(id: string): Promise<Job | null> {
    const row = await this.db.query.job.findFirst({
      where: eq(schema.job.id, id),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Busca Job por dedup hash (detectar duplicados de múltiples fuentes) */
  async findByDedupHash(hash: string): Promise<Job | null> {
    const row = await this.db.query.job.findFirst({
      where: eq(schema.job.dedupHash, hash),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Carga todos los Jobs de una fuente específica */
  async findBySourceId(sourceId: string): Promise<Job[]> {
    const rows = await this.db.query.job.findMany({
      where: eq(schema.job.sourceId, sourceId),
    });

    return rows.map((row) => this.mapFromDb(row));
  }

  /* Carga Jobs recientes (para el feed) */
  async findRecent(limit: number = 50): Promise<Job[]> {
    const rows = await this.db.query.job.findMany({
      orderBy: desc(schema.job.ingestedAt),
      limit,
    });

    return rows.map((row) => this.mapFromDb(row));
  }

  /* Actualiza Job existente */
  async update(job: Job): Promise<Job> {
    const updated = await this.db
      .update(schema.job)
      .set({
        title: job.title,
        company: job.company,
        location: job.location,
        modality: job.modality,
        seniority: job.seniority,
        description: job.description,
        url: job.url,
        postedAt: job.postedAt,
        salary: job.salary as unknown as Record<string, unknown>,
        raw: job.raw as unknown as Record<string, unknown>,
      })
      .where(eq(schema.job.id, job.id))
      .returning();

    if (!updated.length) {
      throw new Error(`Job with id ${job.id} not found`);
    }

    return this.mapFromDb(updated[0]);
  }

  /* Borra Job por ID (los scores y documents se borran en cascade) */
  async delete(id: string): Promise<void> {
    await this.db.delete(schema.job).where(eq(schema.job.id, id));
  }

  private mapFromDb(row: DbJob): Job {
    return new Job({
      id: row.id,
      sourceId: row.sourceId,
      externalId: row.externalId,
      title: row.title,
      company: row.company,
      location: row.location ?? undefined,
      modality: row.modality as 'remote' | 'hybrid' | 'onsite' | 'unknown',
      seniority: row.seniority as 'junior' | 'mid' | 'senior' | 'lead' | 'unknown',
      description: row.description,
      url: row.url,
      postedAt: row.postedAt ?? row.ingestedAt,
      salary: (row.salary as { min?: number; max?: number; currency?: string }) ?? undefined,
      raw: (row.raw as Record<string, unknown>) ?? {},
      dedupHash: row.dedupHash,
      ingestedAt: row.ingestedAt,
    });
  }
}
