import { z } from 'zod';

/**
 * Schemas de entrada para Experience.
 *
 * FECHAS: se reciben como "YYYY-MM" porque en un CV solo importan mes y año
 * (nadie pone "15 de abril"). Es además lo que emite un <input type="month">.
 * Se convierten a Date en UTC explícito: sin la Z, `new Date('2025-04-01')` se
 * interpreta en la zona local y en UTC-5 (Perú) retrocedería al 31 de marzo,
 * mostrando el mes anterior en el CV.
 */
const MonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato esperado: YYYY-MM')
  .transform((value) => new Date(`${value}-01T00:00:00.000Z`));

export const CreateExperienceSchema = z
  .object({
    company: z.string().min(1),
    role: z.string().min(1),
    location: z.string().optional(),
    startDate: MonthSchema,
    /** Ausente o null = sigue trabajando ahí. */
    endDate: MonthSchema.nullish(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['endDate'],
  });

export type CreateExperienceDto = z.infer<typeof CreateExperienceSchema>;

/**
 * Actualización: mismos campos, todos opcionales. No se usa `.partial()` porque
 * el objeto base lleva un `.refine` (ZodEffects no expone `.partial()`); se
 * declara sobre el objeto interno y se revalida la coherencia de fechas contra
 * los valores que finalmente queden, ya en el controlador.
 */
export const UpdateExperienceSchema = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  location: z.string().optional(),
  startDate: MonthSchema.optional(),
  endDate: MonthSchema.nullish(),
});

export type UpdateExperienceDto = z.infer<typeof UpdateExperienceSchema>;
