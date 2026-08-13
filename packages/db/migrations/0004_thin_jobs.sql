-- Permite que una vacante exista SIN descripción. Ver ADR-0029.
--
-- Los correos de alertas (LinkedIn, Glassdoor, Computrabajo) son
-- notificaciones: traen tarjeta y enlace, no el texto de la oferta. Descubrir y
-- enriquecer pasan a ser dos etapas distintas, y una vacante "delgada" es un
-- estado legítimo del sistema —la Capa 1 del embudo ya puede juzgarla con los
-- metadatos que sí trae— y no un error de parseo.
--
-- Idempotente: `DROP NOT NULL` sobre una columna ya nullable no hace nada, y
-- las columnas nuevas usan IF NOT EXISTS.

-- 1. La descripción deja de ser obligatoria.
ALTER TABLE "job" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint

-- 2. Distingue "todavía no se ha intentado" de "se intentó y no se pudo".
--    Ambas se ven igual desde fuera (sin descripción), y sin esta marca los
--    callejones sin salida se reintentarían en cada ingesta programada.
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "enrichment_failed" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- 3. Qué paso de la cascada resolvió la vacante. No es decoración: la tasa de
--    acierto por paso es la medición que dirá si el atajo por ATS pública vale
--    la pena para la búsqueda real de este usuario (ADR-0029).
ALTER TABLE "job" ADD COLUMN IF NOT EXISTS "enriched_by" text;--> statement-breakpoint

-- 4. Las vacantes que ya existen tienen descripción (era NOT NULL hasta ahora),
--    así que quedan marcadas como enriquecidas por el camino de la Fase 1: el
--    usuario pegó el JD a mano.
UPDATE "job" SET "enriched_by" = 'manual' WHERE "description" IS NOT NULL AND "enriched_by" IS NULL;
