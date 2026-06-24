# Project Structure

```
jobfinder/
├── docs/
│   ├── PRD.md                      # Product requirements
│   ├── ARQUITECTURA.md             # Technical architecture
│   └── SETUP.md                    # Installation guide
│
├── apps/
│   ├── api/                        # REST backend (NestJS + Fastify)
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   └── modules/
│   │   │       ├── jobs/
│   │   │       ├── profiles/
│   │   │       └── applications/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                     # Async job processor (NestJS + BullMQ)
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   └── processors/
│   │   │       ├── ingest.processor.ts
│   │   │       ├── score.processor.ts
│   │   │       └── tailor.processor.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Frontend (Next.js)
│       ├── app/
│       │   ├── page.tsx            # Landing
│       │   ├── setup/              # Onboarding
│       │   ├── dashboard/          # Main UI
│       │   └── api/                # API routes
│       ├── components/
│       ├── lib/
│       ├── public/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── core/                       # Domain logic (NO framework dependencies)
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   ├── Profile.ts
│   │   │   │   │   ├── Job.ts
│   │   │   │   │   └── Bullet.ts
│   │   │   │   └── value-objects/
│   │   │   │       └── JobScore.ts
│   │   │   ├── ports/
│   │   │   │   ├── JobSourcePort.ts
│   │   │   │   ├── LlmPort.ts
│   │   │   │   └── EmbedderPort.ts
│   │   │   ├── errors/
│   │   │   │   └── DomainError.ts
│   │   │   └── index.ts            # Barrel export
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── db/                         # Database (Drizzle ORM)
│   │   ├── src/
│   │   │   ├── schema.ts           # Table definitions
│   │   │   ├── repositories/       # Implementations of core ports
│   │   │   ├── migrations/         # SQL migrations
│   │   │   └── index.ts
│   │   ├── scripts/
│   │   │   └── migrate.ts          # Migration runner
│   │   ├── drizzle.config.ts       # Drizzle CLI config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── shared/                     # Shared types & schemas
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── schemas/
│   │   │   └── utils/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── sources/                    # Job source adapters
│   │   ├── src/
│   │   │   ├── gmail/              # Gmail adapter
│   │   │   ├── getonboard/         # GetOnBoard adapter
│   │   │   ├── remotive/           # Remotive adapter
│   │   │   ├── adzuna/             # Adzuna adapter
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── llm/                        # Claude & embeddings adapters
│   │   ├── src/
│   │   │   ├── claude/             # Claude API adapter
│   │   │   │   ├── client.ts       # Anthropic SDK wrapper
│   │   │   │   ├── prompts/
│   │   │   │   └── guardrails.ts
│   │   │   ├── embeddings/         # Voyage AI or local embeddings
│   │   │   │   ├── voyage.ts
│   │   │   │   └── local.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── documents/                  # CV/cover letter generation
│       ├── src/
│       │   ├── generators/
│       │   │   ├── cv.generator.ts
│       │   │   └── cover.generator.ts
│       │   ├── templates/
│       │   │   ├── cv-template.html
│       │   │   └── cover-template.html
│       │   ├── exporters/
│       │   │   ├── pdf.exporter.ts (Puppeteer)
│       │   │   └── docx.exporter.ts
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── .env.example                    # Template for .env
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── docker-compose.yml              # Local dev: Postgres + Redis
├── docker-compose.prod.yml         # Production (optional)
├── pnpm-workspace.yaml             # Monorepo config
├── package.json                    # Root scripts
├── tsconfig.json                   # Base TS config
├── README.md
├── STRUCTURE.md                    # This file
└── SETUP.md                        # Installation guide
```

## Key Design Principles

### Hexagonal (Ports & Adapters)
- **Core** defines what it needs (ports).
- **Adapters** implement those ports.
- **Apps** compose and orchestrate.

### Monorepo with pnpm workspaces
- Shared types and utilities via `@jobfinder/*` imports.
- Each package is independently buildable and testable.
- Dependency graph: `core` → `db`, `sources`, `llm`, `documents` → `api`, `worker`, `web`.

### Local-first
- All data lives in local Postgres (via Docker).
- No cloud services for user data.
- External APIs only for LLM (Claude), embeddings (Voyage), and OAuth (Google).

## Getting Started

1. Read [SETUP.md](./SETUP.md) to install and run locally.
2. Read [docs/PRD.md](./docs/PRD.md) for product context.
3. Read [docs/ARQUITECTURA.md](./docs/ARQUITECTURA.md) for technical details.
4. Start with **Fase 1** (profile + tailoring in `apps/api` and `packages/documents`).
