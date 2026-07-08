import { z } from 'zod';

/**
 * Schemas de entrada para los endpoints de Bullet.
 *
 * El profileId NO va en el body: viene de la URL (/profiles/:profileId/bullets).
 * UpdateBulletSchema deriva del create con .partial() -> todos los campos
 * opcionales (PATCH parcial), sin duplicar la definición.
 */

export const CreateBulletSchema = z.object({
  textEs: z.string().min(1),
  textEn: z.string().min(1),
  skills: z.array(z.string()),
  category: z.enum(['experience', 'achievement', 'project', 'education']),
  sourceRole: z.string().optional(),
  metrics: z.record(z.union([z.string(), z.number()])).optional(),
});

export type CreateBulletDto = z.infer<typeof CreateBulletSchema>;

export const UpdateBulletSchema = CreateBulletSchema.partial();

export type UpdateBulletDto = z.infer<typeof UpdateBulletSchema>;
