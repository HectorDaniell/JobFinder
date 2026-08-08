import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Experience, type ExperienceKind } from '@jobfinder/core';
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
      kind: experience.kind,
      organization: experience.organization,
      title: experience.title,
      location: experience.location,
      url: experience.url,
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

  /* Todos los contenedores de un perfil (empleos, proyectos y educación),
     ordenados como en un CV: el más reciente primero. Quien consuma esto agrupa
     por `kind` para las 3 secciones del CV; ver buildResumeModel. */
  async findByProfileId(profileId: string): Promise<Experience[]> {
    const rows = await this.db.query.experience.findMany({
      where: eq(schema.experience.profileId, profileId),
    });

    return rows.map((row) => this.mapFromDb(row)).sort(Experience.byMostRecent);
  }

  /* Actualiza un contenedor existente. `kind` no se actualiza: cambiar de tipo
     (p. ej. un empleo a proyecto) no es una edición, es borrar y crear otro. */
  async update(experience: Experience): Promise<Experience> {
    const updated = await this.db
      .update(schema.experience)
      .set({
        organization: experience.organization,
        title: experience.title,
        location: experience.location,
        url: experience.url,
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

  /* Borra el contenedor. Sus bullets se borran CON ÉL (ON DELETE CASCADE): ya
     no pueden quedar huérfanos, porque experience_id es obligatorio. El
     controller avisa al usuario antes de borrar uno que todavía tenga bullets. */
  async delete(id: string): Promise<void> {
    await this.db.delete(schema.experience).where(eq(schema.experience.id, id));
  }

  private mapFromDb(row: DbExperience): Experience {
    return new Experience({
      id: row.id,
      profileId: row.profileId,
      kind: row.kind as ExperienceKind,
      organization: row.organization,
      title: row.title,
      location: row.location ?? undefined,
      url: row.url ?? undefined,
      startDate: row.startDate,
      endDate: row.endDate ?? undefined, // undefined = sigue en curso
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
