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

/**
 * `organization`/`title` se reinterpretan según `kind` (empresa/rol para un
 * empleo, contexto/nombre para un proyecto, institución/título para un grado)
 * — ver Experience en @jobfinder/core. `url` solo tiene sentido para proyectos,
 * pero no se restringe por `kind`: sería una validación cruzada más para un
 * campo que, si se manda de más, simplemente no se muestra en el CV.
 */
export const CreateExperienceSchema = z
  .object({
    kind: z.enum(['job', 'project', 'education']),
    organization: z.string().min(1),
    title: z.string().min(1),
    location: z.string().optional(),
    url: z.string().url().optional(),
    startDate: MonthSchema,
    /** Ausente o null = sigue en curso. */
    endDate: MonthSchema.nullish(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['endDate'],
  });

export type CreateExperienceDto = z.infer<typeof CreateExperienceSchema>;

/**
 * Actualización: mismos campos salvo `kind`, todos opcionales. Cambiar de tipo
 * (un empleo pasa a ser un proyecto) no es una edición — se borra y se crea
 * otro — así que `kind` es inmutable tras el alta.
 *
 * No se usa `.partial()` porque el objeto base lleva un `.refine` (ZodEffects
 * no expone `.partial()`); se declara sobre el objeto interno y se revalida la
 * coherencia de fechas contra los valores que finalmente queden, en el controlador.
 */
export const UpdateExperienceSchema = z.object({
  organization: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  location: z.string().optional(),
  url: z.string().url().optional(),
  startDate: MonthSchema.optional(),
  endDate: MonthSchema.nullish(),
});

export type UpdateExperienceDto = z.infer<typeof UpdateExperienceSchema>;
