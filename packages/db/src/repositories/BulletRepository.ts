import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Bullet, type BulletCategory } from '@jobfinder/core';
import * as schema from '../schema';

type DbBullet = typeof schema.bullet.$inferSelect;
type DbBulletInsert = typeof schema.bullet.$inferInsert;

export class BulletRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  /* Inserta Bullet en BD, retorna Bullet mapeado */
  async create(bullet: Bullet): Promise<Bullet> {
    const dbInsert: DbBulletInsert = {
      id: bullet.id,
      profileId: bullet.profileId,
      experienceId: bullet.experienceId,
      textEs: bullet.textEs,
      textEn: bullet.textEn,
      skills: bullet.skills,
      category: bullet.category,
      metrics: bullet.metrics as unknown as Record<string, unknown>,
    };

    const inserted = await this.db
      .insert(schema.bullet)
      .values(dbInsert)
      .returning();

    return this.mapFromDb(inserted[0]);
  }

  /* Carga Bullet por ID, retorna entidad dominio */
  async findById(id: string): Promise<Bullet | null> {
    const row = await this.db.query.bullet.findFirst({
      where: eq(schema.bullet.id, id),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Carga todos los Bullets de un Profile */
  async findByProfileId(profileId: string): Promise<Bullet[]> {
    const rows = await this.db.query.bullet.findMany({
      where: eq(schema.bullet.profileId, profileId),
    });

    return rows.map((row) => this.mapFromDb(row));
  }

  /* Actualiza Bullet existente, automáticamente timestamps */
  async update(bullet: Bullet): Promise<Bullet> {
    const updated = await this.db
      .update(schema.bullet)
      .set({
        experienceId: bullet.experienceId,
        textEs: bullet.textEs,
        textEn: bullet.textEn,
        skills: bullet.skills,
        category: bullet.category,
        metrics: bullet.metrics as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(schema.bullet.id, bullet.id))
      .returning();

    if (!updated.length) {
      throw new Error(`Bullet with id ${bullet.id} not found`);
    }

    return this.mapFromDb(updated[0]);
  }

  /* Borra Bullet por ID */
  async delete(id: string): Promise<void> {
    await this.db.delete(schema.bullet).where(eq(schema.bullet.id, id));
  }

  /* Borra todos los Bullets de un Profile (cascade al borrar perfil) */
  async deleteByProfileId(profileId: string): Promise<void> {
    await this.db
      .delete(schema.bullet)
      .where(eq(schema.bullet.profileId, profileId));
  }

  private mapFromDb(row: DbBullet): Bullet {
    return new Bullet({
      id: row.id,
      profileId: row.profileId,
      experienceId: row.experienceId,
      textEs: row.textEs,
      textEn: row.textEn,
      skills: row.skills ?? [],
      category: row.category as BulletCategory,
      metrics: (row.metrics as Record<string, string | number>) ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
