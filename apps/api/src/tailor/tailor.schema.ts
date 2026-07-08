import { z } from 'zod';

/**
 * Schema de entrada de POST /profiles/:profileId/tailor.
 *
 * `job` es la oferta que el usuario PEGA (flujo de Fase 1: nada de scraping).
 * Pedimos los campos que el prompt de Claude aprovecha (title, company,
 * description) y algunos opcionales; el resto de la entidad Job lo rellena el
 * controlador. `formats` decide qué archivos se generan (PDF y/o DOCX).
 */
export const TailorRequestSchema = z.object({
  job: z.object({
    title: z.string().min(1),
    company: z.string().min(1),
    description: z.string().min(1),
    location: z.string().optional(),
    url: z.string().url().optional(),
    modality: z.enum(['remote', 'hybrid', 'onsite', 'unknown']).optional(),
    seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'unknown']).optional(),
  }),
  lang: z.enum(['es', 'en']),
  formats: z.array(z.enum(['pdf', 'docx'])).min(1),
});

export type TailorRequestDto = z.infer<typeof TailorRequestSchema>;
