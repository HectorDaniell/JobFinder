import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Experience } from '@jobfinder/core';
import * as schema from '../schema';

type DbExperience = typeof schema.experience.$inferSelect;
type DbExperienceInsert = typeof schema.experience.$inferInsert;

export class ExperienceRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  /* Inserta Experience en BD, retorna la entidad mapeada */
  async create(experience: Experience): Promise<Experience> {
    const dbInsert: DbExperienceInsert = {
      id: experience.id,
      profileId: experience.profileId,
      company: experience.company,
      role: experience.role,
      location: experience.location,
      startDate: experience.startDate,
      endDate: experience.endDate,
    };

    const inserted = await this.db.insert(schema.experience).values(dbInsert).returning();

    return this.mapFromDb(inserted[0]);
  }

  async findById(id: string): Promise<Experience | null> {
    const row = await this.db.query.experience.findFirst({
      where: eq(schema.experience.id, id),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Todas las experiencias de un perfil, ordenadas como en un CV: la más reciente primero */
  async findByProfileId(profileId: string): Promise<Experience[]> {
    const rows = await this.db.query.experience.findMany({
      where: eq(schema.experience.profileId, profileId),
    });

    return rows.map((row) => this.mapFromDb(row)).sort(Experience.byMostRecent);
  }

  /* Actualiza una experiencia existente */
  async update(experience: Experience): Promise<Experience> {
    const updated = await this.db
      .update(schema.experience)
      .set({
        company: experience.company,
        role: experience.role,
        location: experience.location,
        startDate: experience.startDate,
        endDate: experience.endDate ?? null, // null explícito: "volvió a ser el actual"
        updatedAt: new Date(),
      })
      .where(eq(schema.experience.id, experience.id))
      .returning();

    if (!updated.length) {
      throw new Error(`Experience with id ${experience.id} not found`);
    }

    return this.mapFromDb(updated[0]);
  }

  /* Borra la experiencia. Los bullets NO se borran: su experience_id queda en
     NULL (ON DELETE SET NULL) — perder un empleo no debe perder los logros. */
  async delete(id: string): Promise<void> {
    await this.db.delete(schema.experience).where(eq(schema.experience.id, id));
  }

  private mapFromDb(row: DbExperience): Experience {
    return new Experience({
      id: row.id,
      profileId: row.profileId,
      company: row.company,
      role: row.role,
      location: row.location ?? undefined,
      startDate: row.startDate,
      endDate: row.endDate ?? undefined, // undefined = trabajo actual
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
