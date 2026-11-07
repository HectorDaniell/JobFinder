import { z } from 'zod';

/**
 * Esquema de validación para la solicitud de ingesta de correos (POST /jobs/ingest/email).
 * Todos los campos son opcionales:
 * - since: fecha ISO desde cuándo buscar correos (por defecto los últimos 7 días).
 * - query: consulta de búsqueda adicional para la API de Gmail.
 */
export const IngestEmailRequestSchema = z.object({
  since: z.string().datetime().optional(),
  query: z.string().max(200).optional(),
});

export type IngestEmailRequestDto = z.infer<typeof IngestEmailRequestSchema>;

/**
 * Esquema de validación para la consulta de vacantes recientes (GET /jobs).
 */
export const GetJobsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, {
      message: 'limit must be a positive integer between 1 and 100',
    }),
});

export type GetJobsQueryDto = z.infer<typeof GetJobsQuerySchema>;
