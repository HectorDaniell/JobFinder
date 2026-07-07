import { z } from 'zod';
import { PreferenceSchema } from '@jobfinder/core';

/**
 * Schemas de entrada para los endpoints de Profile.
 *
 * Reutilizamos PreferenceSchema de core para el campo `preferences`: así las
 * preferencias se validan IGUAL en la API y en el repositorio (una sola fuente
 * de verdad). Los tipos (…Dto) se infieren del schema con z.infer, de modo que
 * el schema es la única definición y el tipo nunca se desincroniza.
 */

export const CreateProfileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  links: z
    .object({
      github: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      portfolio: z.string().url().optional(),
    })
    .optional(),
  summaryEs: z.string().min(1),
  summaryEn: z.string().min(1),
  preferences: PreferenceSchema,
});

export type CreateProfileDto = z.infer<typeof CreateProfileSchema>;

/**
 * Actualización: hoy solo preferencias (es lo que el repositorio sabe
 * actualizar y lo que cambia con frecuencia). La forma `{ preferences }` deja
 * espacio para añadir más campos editables en el futuro sin romper la ruta.
 */
export const UpdateProfileSchema = z.object({
  preferences: PreferenceSchema,
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
