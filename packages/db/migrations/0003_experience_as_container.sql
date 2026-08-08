-- Generaliza `experience` de "un empleo" a un CONTENEDOR (kind: job/project/
-- education) y hace obligatorio que todo bullet pertenezca a uno. Ver ADR-0028.

-- 1. `kind`: nullable primero, backfill 'job' para las filas existentes (todas
--    eran empleos hasta ahora), luego NOT NULL.
ALTER TABLE "experience" ADD COLUMN IF NOT EXISTS "kind" text;--> statement-breakpoint
UPDATE "experience" SET "kind" = 'job' WHERE "kind" IS NULL;--> statement-breakpoint
ALTER TABLE "experience" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint

-- 2. Los campos que ahora se reinterpretan según `kind` (empresa/rol para un
--    empleo, contexto/nombre para un proyecto, institución/título para un
--    grado) se renombran a su nombre genérico.
ALTER TABLE "experience" RENAME COLUMN "company" TO "organization";--> statement-breakpoint
ALTER TABLE "experience" RENAME COLUMN "role" TO "title";--> statement-breakpoint

-- 3. `url`: solo lo usan los proyectos.
ALTER TABLE "experience" ADD COLUMN IF NOT EXISTS "url" text;--> statement-breakpoint

-- 4. Crear un contenedor por cada (perfil, source_role, category) DISTINTO entre
--    los bullets huérfanos (hoy agrupados por un campo de texto libre). DISTINCT
--    colapsa los que comparten source_role en UN solo contenedor — p. ej. los
--    bullets de una misma tesis pasan a compartir un único proyecto.
--
--    organization/title salen del propio source_role: es un TÍTULO PROVISIONAL,
--    no un dato real, igual que start_date (usa el created_at más antiguo del
--    grupo, la única fecha disponible). Estos contenedores deben EDITARSE desde
--    la UI después de aplicar esta migración para poner fechas y títulos reales.
INSERT INTO "experience" ("id", "profile_id", "kind", "organization", "title", "start_date", "created_at", "updated_at")
SELECT
  gen_random_uuid(),
  b."profile_id",
  CASE WHEN b."category" = 'education' THEN 'education' ELSE 'project' END,
  b."source_role",
  b."source_role",
  min(b."created_at"),
  now(),
  now()
FROM "bullet" b
WHERE b."experience_id" IS NULL AND b."source_role" IS NOT NULL
GROUP BY b."profile_id", b."source_role", b."category";--> statement-breakpoint

-- 5. Enganchar cada bullet huérfano al contenedor recién creado que comparte
--    perfil + source_role + el kind derivado de su category.
UPDATE "bullet" b
SET "experience_id" = e."id"
FROM "experience" e
WHERE b."experience_id" IS NULL
  AND b."source_role" IS NOT NULL
  AND e."profile_id" = b."profile_id"
  AND e."organization" = b."source_role"
  AND e."kind" = CASE WHEN b."category" = 'education' THEN 'education' ELSE 'project' END;--> statement-breakpoint

-- 6. `category` deja de distinguir el tipo de contenedor (eso ahora lo hace
--    `kind`); los valores 'project'/'education' colapsan al genérico 'achievement'.
UPDATE "bullet" SET "category" = 'achievement' WHERE "category" NOT IN ('experience', 'achievement');--> statement-breakpoint

-- 7. experience_id obligatorio: a estas alturas ningún bullet real debería
--    seguir en NULL (o ya tenía un empleo enlazado, o el paso 5 lo acaba de
--    resolver). Si esto falla, hay un bullet sin source_role que investigar.
ALTER TABLE "bullet" ALTER COLUMN "experience_id" SET NOT NULL;--> statement-breakpoint

-- 8. Al ser obligatorio, borrar el contenedor debe borrar sus bullets: ya no
--    tienen sentido sin él (antes quedaban huérfanos con SET NULL).
ALTER TABLE "bullet" DROP CONSTRAINT IF EXISTS "bullet_experience_id_experience_id_fk";--> statement-breakpoint
ALTER TABLE "bullet" ADD CONSTRAINT "bullet_experience_id_experience_id_fk"
  FOREIGN KEY ("experience_id") REFERENCES "experience"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 9. source_role ya no hace falta: el título vive en el contenedor.
ALTER TABLE "bullet" DROP COLUMN IF EXISTS "source_role";
