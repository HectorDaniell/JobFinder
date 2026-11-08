# ADR-0016: Validación con Zod y traducción de errores de dominio en la API

> Estado: **Aceptado** · Fecha: 2026-07-08

## Contexto

La API (NestJS) es un adaptador de entrada: recibe datos que no controla y debe
(1) validar la ENTRADA antes de tocar el dominio y (2) devolver errores HTTP
coherentes cuando algo falla en cualquier capa. Sin una estrategia común, cada
endpoint repetiría validación y manejo de errores, y un error de dominio no
mapeado se escaparía como un `500` genérico.

Ya usamos **Zod** en `core` (p. ej. `PreferenceSchema`) y en `db`. Y los errores
del dominio (`DomainError` y subclases) ya cargan su `code` y su `statusCode`.

## Decisión

Dos piezas transversales, aplicadas a TODA la API:

- **`ZodValidationPipe`** (por ruta): valida el body contra un schema Zod con
  `safeParse`; si falla, lanza `ValidationError` (un `DomainError`, 400).
- **`DomainExceptionFilter`** (global, vía `APP_FILTER`): captura cualquier
  `DomainError` y responde `{ error: { code, message, field? } }` con su
  `statusCode`.

El pipe lanza un error de DOMINIO (no uno de Nest) para que TODO —validación de
entrada y reglas de negocio— pase por el mismo traductor y salga con un formato
único.

## Alternativas descartadas

- **`class-validator` + `class-transformer`** (lo típico en Nest): duplicaría la
  fuente de verdad de validación (ya usamos Zod) y ata los DTOs a clases con
  decoradores. Zod es más liviano y se reutiliza entre capas.
- **`try/catch` en cada controlador**: repite el mapeo error→HTTP en todos lados
  y es fácil de olvidar. El filtro global lo centraliza.
- **Registrar el filtro con `useGlobalFilters` en `main.ts`**: no aplicaría en los
  tests e2e (que no ejecutan `main.ts`). `APP_FILTER` aplica en prod Y en tests.

## Consecuencias

- Formato de error **uniforme** en toda la API, con una sola pieza.
- El controlador queda limpio: solo lanza errores de dominio; el filtro hace el
  resto. Depende de que `instanceof DomainError` sea fiable (fix en `DomainError`
  con `new.target.prototype`).
- Los errores del package `llm` (que ya extienden `DomainError`) se traducen
  gratis: sin bullets → 422, rate limit → 429, timeout → 504, etc.
- El schema Zod es la única definición; los tipos se infieren con `z.infer` (no se
  desincronizan).
