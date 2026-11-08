import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Profile, Preferences, PreferenceSchema } from '@jobfinder/core';
import * as schema from '../schema';

type DbProfile = typeof schema.profile.$inferSelect;
type DbProfileInsert = typeof schema.profile.$inferInsert;

export class ProfileRepository {
  constructor(private db: PostgresJsDatabase<typeof schema>) {}

  /* Inserta Profile en BD, retorna Profile mapeado */
  async create(profile: Profile): Promise<Profile> {
    const dbInsert: DbProfileInsert = {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      links: profile.links,
      summaryEs: profile.summaryEs,
      summaryEn: profile.summaryEn,
      preferences: profile.preferences as unknown as Record<string, unknown>,
    };

    const inserted = await this.db
      .insert(schema.profile)
      .values(dbInsert)
      .returning();

    return this.mapFromDb(inserted[0]);
  }

  /* Carga Profile por ID, retorna entidad dominio */
  async findById(id: string): Promise<Profile | null> {
    const row = await this.db.query.profile.findFirst({
      where: eq(schema.profile.id, id),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Busca por email (necesario para login) */
  async findByEmail(email: string): Promise<Profile | null> {
    const row = await this.db.query.profile.findFirst({
      where: eq(schema.profile.email, email),
    });

    if (!row) return null;
    return this.mapFromDb(row);
  }

  /* Actualiza preferencias, automáticamente timestamps */
  async updatePreferences(id: string, prefs: Preferences): Promise<Profile> {
    const updated = await this.db
      .update(schema.profile)
      .set({
        preferences: prefs as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(schema.profile.id, id))
      .returning();

    if (!updated.length) {
      throw new Error(`Profile with id ${id} not found`);
    }

    return this.mapFromDb(updated[0]);
  }

  /* Borra Profile (las Bullets se borran en cascade por FK) */
  async delete(id: string): Promise<void> {
    await this.db.delete(schema.profile).where(eq(schema.profile.id, id));
  }

  private mapFromDb(row: DbProfile): Profile {
    const prefsRaw = row.preferences as unknown;
    const prefs = PreferenceSchema.parse(prefsRaw);

    return new Profile({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone ?? undefined,
      links: (row.links as { github?: string; linkedin?: string; portfolio?: string }) ?? {},
      summaryEs: row.summaryEs,
      summaryEn: row.summaryEn,
      preferences: prefs,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
