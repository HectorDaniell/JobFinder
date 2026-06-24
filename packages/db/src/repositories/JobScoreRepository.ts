import { eq, desc, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { JobScore } from '@jobfinder/core';
import * as schema from '../schema';

type DbJobScore = typeof schema.jobScore.$inferSelect;
type DbJobScoreInsert = typeof schema.jobScore.$inferInsert;

export class JobScoreRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  /* Inserta Score de evaluación de Job en BD */
  async create(score: JobScore): Promise<JobScore> {
    const dbInsert: DbJobScoreInsert = {
      jobId: score.jobId,
      layer: score.layer,
      score: String(score.score),
      decision: score.decision,
      reasoning: score.reasoning,
      missingKeywords: score.missingKeywords,
      gapAnalysis: score.gapAnalysis,
      model: score.model,
    };

    const inserted = await this.db
      .insert(schema.jobScore)
      .values(dbInsert)
      .returning();

    return this.mapFromDb(inserted[0]);
  }

  /* Carga todos los Scores de un Job (múltiples capas: rules, embedding, llm) */
  async findByJobId(jobId: string): Promise<JobScore[]> {
    const rows = await this.db.query.jobScore.findMany({
      where: eq(schema.jobScore.jobId, jobId),
      orderBy: desc(schema.jobScore.createdAt),
    });

    return rows.map((row) => this.mapFromDb(row));
  }

  /* Carga el Score más reciente de un Job */
  async findLatestByJobId(jobId: string): Promise<JobScore | null> {
    const row = await this.db.query.jobScore.findFirst({
      where: eq(schema.jobScore.jobId, jobId),
      orderBy: desc(schema.jobScore.createdAt),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Carga el Score más reciente de un Job para una capa específica */
  async findLatestByJobIdAndLayer(
    jobId: string,
    layer: 'rules' | 'embedding' | 'llm'
  ): Promise<JobScore | null> {
    const row = await this.db.query.jobScore.findFirst({
      where: and(
        eq(schema.jobScore.jobId, jobId),
        eq(schema.jobScore.layer, layer)
      ),
      orderBy: desc(schema.jobScore.createdAt),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Borra Scores de un Job para una capa específica (para reentrenamiento) */
  async deleteByJobIdAndLayer(jobId: string, layer: string): Promise<void> {
    await this.db
      .delete(schema.jobScore)
      .where(
        and(
          eq(schema.jobScore.jobId, jobId),
          eq(schema.jobScore.layer, layer)
        )
      );
  }

  private mapFromDb(row: DbJobScore): JobScore {
    return new JobScore({
      jobId: row.jobId,
      layer: row.layer as 'rules' | 'embedding' | 'llm',
      score: parseInt(row.score, 10),
      decision: row.decision as 'apply' | 'maybe' | 'skip',
      reasoning: row.reasoning || '',
      missingKeywords: row.missingKeywords ?? [],
      gapAnalysis: row.gapAnalysis || '',
      model: row.model ?? undefined,
      createdAt: row.createdAt,
    });
  }
}
