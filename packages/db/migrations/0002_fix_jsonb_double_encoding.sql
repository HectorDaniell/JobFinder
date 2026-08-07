-- Repara el JSON que se guardó DOBLEMENTE CODIFICADO (ver ADR-0024).
--
-- La columna `jsonb` de serie de Drizzle hacía JSON.stringify antes de pasar el
-- valor a postgres.js, que serializa por su cuenta. Postgres acabó guardando una
-- CADENA que contiene JSON en vez del objeto, así que `col->>'clave'` devolvía
-- NULL y ningún índice GIN servía.
--
-- `col #>> '{}'` extrae el contenido textual de ese jsonb-cadena, y `::jsonb`
-- lo vuelve a parsear: esta vez como objeto de verdad.
--
-- IDEMPOTENTE: solo toca filas cuyo jsonb sea de tipo 'string'. Las ya correctas
-- y los NULL se quedan igual, así que volver a ejecutarla no hace nada.

UPDATE "profile" SET "links" = ("links" #>> '{}')::jsonb
  WHERE jsonb_typeof("links") = 'string';--> statement-breakpoint
UPDATE "profile" SET "preferences" = ("preferences" #>> '{}')::jsonb
  WHERE jsonb_typeof("preferences") = 'string';--> statement-breakpoint
UPDATE "bullet" SET "metrics" = ("metrics" #>> '{}')::jsonb
  WHERE jsonb_typeof("metrics") = 'string';--> statement-breakpoint
UPDATE "source" SET "config" = ("config" #>> '{}')::jsonb
  WHERE jsonb_typeof("config") = 'string';--> statement-breakpoint
UPDATE "job" SET "salary" = ("salary" #>> '{}')::jsonb
  WHERE jsonb_typeof("salary") = 'string';--> statement-breakpoint
UPDATE "job" SET "raw" = ("raw" #>> '{}')::jsonb
  WHERE jsonb_typeof("raw") = 'string';--> statement-breakpoint
UPDATE "document" SET "content" = ("content" #>> '{}')::jsonb
  WHERE jsonb_typeof("content") = 'string';--> statement-breakpoint
UPDATE "application" SET "answers" = ("answers" #>> '{}')::jsonb
  WHERE jsonb_typeof("answers") = 'string';--> statement-breakpoint
UPDATE "application_event" SET "payload" = ("payload" #>> '{}')::jsonb
  WHERE jsonb_typeof("payload") = 'string';
