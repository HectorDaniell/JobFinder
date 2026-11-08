# api (@jobfinder REST API)

NestJS + Fastify HTTP layer over the JobFinder packages. It's a **driving
adapter**: it translates HTTP ⇆ calls into the framework-agnostic packages
(`core`, `db`, `llm`, `documents`). It holds no business logic — it orchestrates.

## Endpoints

| Method | Route | Body | Success | Errors |
|---|---|---|---|---|
| GET | `/health` | — | 200 | — |
| POST | `/profiles` | create-profile | 201 + Profile | 400, 409 |
| GET | `/profiles/:id` | — | 200 + Profile | 404 |
| PATCH | `/profiles/:id` | `{ preferences }` | 200 + Profile | 400, 404 |
| DELETE | `/profiles/:id` | — | 204 | — |
| POST | `/profiles/:id/bullets` | create-bullet | 201 + Bullet | 400, 404 |
| GET | `/profiles/:id/bullets` | — | 200 + Bullet[] | — |
| GET | `/profiles/:id/bullets/:bid` | — | 200 + Bullet | 404 |
| PATCH | `/profiles/:id/bullets/:bid` | update-bullet | 200 + Bullet | 400, 404 |
| DELETE | `/profiles/:id/bullets/:bid` | — | 204 | 404 |
| POST | `/profiles/:id/tailor` | job + lang + formats | 200 + files | 400, 404, 422, 429, 502, 504 |

All errors share one shape: `{ "error": { "code", "message", "field?" } }`.

`/tailor` returns the cv/cover-letter preview plus the generated files as
**base64** (JSON can't carry binary):
`{ cv, coverLetter, files: [{ filename, mimeType, base64 }] }`.

## Structure

- `main.ts` — bootstrap (Fastify adapter, loads `.env` first)
- `app.module.ts` — root module; registers `DomainExceptionFilter` as `APP_FILTER`
- `infra/` — the **composition root**
  - `infra.module.ts` — wires the packages' plain classes as providers (`useFactory` + `inject`)
  - `lazy-llm.ts` — lazy `LlmPort` proxy (the Claude client is built on first use)
- `common/` — cross-cutting
  - `pipes/zod-validation.pipe.ts` — validates input against a Zod schema (→ 400)
  - `filters/domain-exception.filter.ts` — maps any `DomainError` → HTTP
- `profiles/`, `bullets/`, `tailor/` — one module + controller + Zod schemas each

## How it fits (hexagonal)

```
HTTP → [ ZodValidationPipe ] → Controller → repo (CRUD)  |  TailorDocuments (use case) → packages
                                     ↑ any DomainError ↓
                               [ DomainExceptionFilter ]   → uniform HTTP error
```

- **CRUD** (profiles, bullets): controller → repository directly (no use case —
  it's a straight validate → repo → respond).
- **`/tailor`**: controller → `TailorDocuments` (core), which orchestrates
  LLM + documents. See `docs/adr/0016`–`0018`.

## Running

```bash
pnpm --filter api dev     # watch mode (needs DATABASE_URL; Postgres on :5433)
pnpm --filter api build   # nest build
pnpm --filter api start   # node dist/main.js
```

`ANTHROPIC_API_KEY` is **not** required to boot — only `POST /tailor` needs it
(built lazily). Missing key → `500 INVALID_ANTHROPIC_KEY` on that route only.

## Testing

```bash
pnpm --filter api test    # vitest run (unit + e2e)
```

- **Unit**: controllers / pipe / filter with mocked collaborators (no DB, no Claude).
- **e2e** (`tests/app.e2e.test.ts`): boots the real Nest container and drives it
  with Fastify's `app.inject()`; in-memory fake repos + mocked `TailorDocuments`.
  Covers routing, validation (400), error mapping (404/409) and `/tailor` (200).

DI in the controllers uses explicit `@Inject(Token)` because Vitest's esbuild does
not emit decorator metadata — see ADR-0018.

## Status

- Profiles CRUD ✅ · Bullets CRUD ✅ · `/tailor` ✅ · e2e ✅ (34 tests)
- Persisting generated documents (`DocumentRepository`) is deferred to Phase 3.
- Ingestion (Gmail / API sources) and auth are Phase 2.
