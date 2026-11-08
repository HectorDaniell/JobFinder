# Project Structure

> Estructura **real** del repositorio (actualizada 2026-08-23, inicio de la Fase 2).
> Lo marcado con ⬜ existe como carpeta/esqueleto pero se implementa en fases futuras.

```
jobfinder/
├── docs/
│   ├── PRD.md              # Qué se construye y por qué (requisitos)
│   ├── ARQUITECTURA.md     # Diseño técnico (hexagonal, etapas, datos)
│   ├── ROADMAP.md          # Plan por sprints
│   ├── PROGRESS.md         # Log de lo realmente construido  ← estado actual
│   ├── FLUJO.md            # Diagramas: el recorrido completo end-to-end
│   ├── SETUP.md            # Instalación y puesta en marcha
│   └── adr/                # Architecture Decision Records (0009–0029)
│
├── apps/
│   ├── api/                        # REST API (NestJS + Fastify) — adaptador de ENTRADA
│   │   ├── src/
│   │   │   ├── main.ts             # bootstrap (Fastify, CORS, .env)
│   │   │   ├── app.module.ts       # módulo raíz + filtro global de errores
│   │   │   ├── infra/              # COMPOSITION ROOT: construye los adapters
│   │   │   │   ├── infra.module.ts
│   │   │   │   ├── lazy-llm.ts     # Claude perezoso (arranca sin API key)
│   │   │   │   └── fake-llm.ts     # doble de desarrollo (USE_FAKE_LLM)
│   │   │   ├── common/
│   │   │   │   ├── pipes/          # ZodValidationPipe (valida la entrada)
│   │   │   │   └── filters/        # DomainExceptionFilter (errores → HTTP)
│   │   │   ├── profiles/           # CRUD de perfil
│   │   │   ├── experiences/        # CRUD de empleos (anidado bajo perfil)
│   │   │   ├── bullets/            # CRUD de bullets (anidado bajo perfil)
│   │   │   ├── tailor/             # POST /profiles/:id/tailor
│   │   │   └── health/
│   │   ├── tests/                  # unitarios + e2e (48)
│   │   └── README.md
│   │
│   ├── web/                        # UI (Next.js 14, App Router)
│   │   ├── app/
│   │   │   ├── layout.tsx          # punto de entrada: html, fuentes, header, Context
│   │   │   ├── page.tsx            # landing
│   │   │   ├── setup/              # alta de perfil (wizard 3 pasos)
│   │   │   ├── tailor/             # pantalla estrella: oferta → CV/carta → descarga
│   │   │   ├── experiences/        # empleos: dan empresa y fechas a los bullets
│   │   │   ├── bullets/            # banco de bullets (CRUD)
│   │   │   └── profile/            # ver perfil / editar preferencias
│   │   ├── components/
│   │   │   ├── ui/                 # primitivas de formulario · DeleteButton · TagInput
│   │   │   ├── ProfileProvider.tsx # Context del profileId
│   │   │   ├── TailorSkeleton.tsx  # carga con la forma del resultado
│   │   │   ├── DownloadButton.tsx  # descarga con icono y color por formato
│   │   │   └── Header.tsx · ThemeToggle.tsx · BulletForm.tsx · ExperienceForm.tsx
│   │   ├── lib/                    # api.ts (cliente HTTP) · types.ts · download.ts · dates.ts
│   │   └── README.md
│   │
│   └── worker/  ⬜                 # colas BullMQ para ingesta programada (Fase 2)
│       └── src/                    # solo esqueleto: main.ts + app.module.ts
│
├── packages/
│   ├── core/                       # DOMINIO — no depende de nadie
│   │   ├── src/
│   │   │   ├── domain/entities/    # Profile · Job (delgado o enriquecido) · Bullet · Experience
│   │   │   ├── domain/value-objects/  # JobScore
│   │   │   ├── ports/              # LlmPort · DocumentPort · EmbedderPort ⬜ ·
│   │   │   │                       # JobSourcePort · JobEnricherPort · EmailReaderPort (ADR-0029)
│   │   │   ├── use-cases/          # TailorDocuments (compone el CV, no solo orquesta)
│   │   │   ├── errors/             # DomainError y subclases (con statusCode HTTP)
│   │   │   └── index.ts            # barrel
│   │   └── tests/
│   │
│   ├── db/                         # Drizzle + Postgres (adaptador de SALIDA)
│   │   ├── src/schema.ts           # 10 tablas
│   │   ├── src/columns.ts          # `jsonb` propio, sin doble codificación (ADR-0024)
│   │   ├── src/repositories/       # Profile · Bullet · Experience · Job · JobScore
│   │   ├── migrations/             # 0000 inicial · 0001 experience · 0002 fix jsonb ·
│   │   │                           # 0003 experience como contenedor (ADR-0028) ·
│   │   │                           # 0004 vacantes delgadas (ADR-0029)
│   │   └── scripts/                # migrate.js · seed.ts
│   │                               # ⚠️ sin tests: deuda abierta desde el Sprint 1
│   │
│   ├── llm/                        # Claude (adaptador de SALIDA)
│   │   ├── src/claude/             # client · adapter · guardrails · prompts/*.txt
│   │   └── scripts/copy-prompts.js # los .txt al dist (tsc no copia lo que no es .ts)
│   │
│   ├── documents/                  # PDF/DOCX ATS-friendly (adaptador de SALIDA)
│   │   └── src/                    # model/ (mappers puros) · exporters/ · adapter.ts
│   │
│   ├── sources/  ⬜                # VACÍO. Adapters de ingesta (Fase 2, ADR-0029):
│   │                               # descubrir → Gmail · Remotive · Adzuna
│   │                               # enriquecer → Greenhouse · Lever · Ashby · captura
│   └── shared/   ⬜                # VACÍO. Utilidades comunes
│
├── docker-compose.yml              # Postgres 16 (:5433) + Redis (:6379)
├── pnpm-workspace.yaml             # workspaces + allowBuilds (supply-chain)
└── .env / .env.example
```

## La regla que ordena todo

```
apps/*        →  pueden importar cualquier package
packages/db, llm, documents  →  importan SOLO core
packages/core →  no importa nada del proyecto (solo zod)
```

No es disciplina: es **física**. `core` no lista ningún `@jobfinder/*` en su
`package.json`, así que pnpm no le resolvería el import aunque se intentara.

El framework (NestJS) vive **solo** en `apps/api`; Next.js **solo** en `apps/web`.
Los packages son agnósticos y reutilizables por el futuro `worker`.
