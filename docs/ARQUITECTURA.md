# JobFinder — Arquitectura Técnica

> Estado: **Diseño** · Versión 0.1 · Fecha 2026-06-22
> Documento de producto: [PRD.md](./PRD.md) · Diagrama de flujo punto a punto: compartido en el chat.

---

## 1. Resumen

Pipeline modular con arquitectura **hexagonal (puertos y adaptadores)** sobre un **monorepo
TypeScript**. El núcleo de dominio no conoce infraestructura; las fuentes de empleo, el LLM, la
base de datos y los canales de envío son **adapters** intercambiables detrás de interfaces. Esto
hace que **añadir una plataforma nueva sea implementar una interfaz**, no tocar el core.

Flujo: **Fuentes → Ingesta → Normalización/Dedup → Matching (embudo) → Tailoring → Revisión
humana → Postulación → Tracking → Aprendizaje** (que retroalimenta el matching).

## 2. Principios de arquitectura

1. **Hexagonal / Ports & Adapters** — dominio puro en `packages/core`; infraestructura en adapters.
2. **Modular por capacidad** — un módulo por etapa del pipeline, con límites claros.
3. **Open/Closed para fuentes** — toda fuente implementa `JobSourcePort`; agregar = nueva clase.
4. **Local-first** — datos personales en una base local; nada sale salvo a las APIs necesarias.
5. **Determinismo donde se pueda, LLM donde aporte** — reglas y embeddings filtran barato; el LLM
   solo razona sobre el top.
6. **Fail-safe en envío** — por defecto se generan **borradores**; el envío real es explícito.
7. **Todo evento es dato** — la trazabilidad alimenta la analítica y el aprendizaje.

## 3. Vista de alto nivel

```
            ┌──────────── apps/web (Next.js) ─────────────┐
            │   Configuración · Bandeja priorizada ·       │
            │   Revisión de paquetes · Dashboards          │
            └───────────────────┬─────────────────────────┘
                                │ REST/tRPC
            ┌───────────────────▼─────────────────────────┐
            │              apps/api (NestJS)               │
            │  Casos de uso + orquestación + REST          │
            └───────┬───────────────────────┬─────────────┘
                    │ encola                 │ usa
        ┌───────────▼──────────┐   ┌─────────▼──────────────┐
        │  apps/worker (BullMQ)│   │   packages/core        │
        │  ingesta · scoring · │   │  dominio + puertos +    │
        │  tailoring · tracking│   │  casos de uso (sin infra)│
        └───────────┬──────────┘   └─────────┬──────────────┘
                    │ implementan puertos     │
   ┌────────────────┼─────────────────────────┼───────────────┐
   │  packages/sources  packages/llm  packages/documents  packages/db │
   │  (gmail, boards)   (Claude,      (docx, pdf, ATS)    (Drizzle,    │
   │                     embeddings)                       pgvector)   │
   └──────────────────────────────────────────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │ Postgres + pgvector    │  Redis (colas)
        └────────────────────────┘
```

## 4. Stack tecnológico

| Capa | Elección | Por qué |
|---|---|---|
| Runtime | **Node.js 22 LTS** | LTS, estable, performante. |
| Lenguaje | **TypeScript** (strict) | Tipado de extremo a extremo; tipos compartidos. |
| Monorepo | **pnpm workspaces** (+ Turborepo opcional) | Ligero, caché de tareas, dependencias compartidas. |
| Backend | **NestJS** (adaptador Fastify) | Modularidad + DI nativa → encaja con hexagonal. Fastify para rendimiento. |
| Workers/colas | **BullMQ + Redis** | Estándar en Node para jobs en background: reintentos, scheduling, concurrencia. |
| Base de datos | **PostgreSQL 16 + pgvector** | Relacional + búsqueda vectorial en un solo motor. |
| ORM | **Drizzle ORM** | SQL-first, ligero, soporte de primera para `vector`/pgvector. (*Prisma* como alternativa con más DX). |
| Validación | **Zod** | Validación de env, payloads y **salidas del LLM**. |
| LLM (razonamiento) | **Claude** vía `@anthropic-ai/sdk` | Haiku (filtros baratos), Sonnet/Opus (scoring y tailoring). |
| Embeddings | **Voyage AI** (recomendación de Anthropic) | Anthropic no expone embeddings propios. Alternativas: OpenAI `text-embedding-3`, o **local** (`fastembed`/Transformers.js con bge/e5) para coste cero. |
| Email | **googleapis** (Gmail API) + OAuth2 | Cliente oficial; lectura de alertas y creación de borradores. |
| Docs/Drive | **googleapis** (Docs + Drive API) | Importar/leer el CV existente. |
| Documentos CV | **`docx`** (DOCX) + **Puppeteer** (HTML→PDF) | Texto seleccionable, ATS-friendly; control total de plantilla. |
| Frontend | **Next.js (App Router)** + Tailwind | UI simple; comparte tipos del monorepo. |
| Logging | **pino** | Logs estructurados de alto rendimiento. |
| Tests | **Vitest** (+ Supertest) | Rápido, TS nativo. |
| Calidad | **ESLint + Prettier + tsconfig strict** | Consistencia y seguridad de tipos. |
| Empaquetado | **Docker + docker-compose** | Postgres+pgvector, Redis y apps reproducibles. |

## 5. Estructura del monorepo

```
jobfinder/
├─ apps/
│  ├─ api/            # NestJS: REST + orquestación de casos de uso
│  ├─ worker/         # NestJS standalone + BullMQ processors
│  └─ web/            # Next.js: config, bandeja, revisión, dashboards
├─ packages/
│  ├─ core/           # DOMINIO: entidades, value objects, PUERTOS, casos de uso (sin infra)
│  ├─ db/             # Drizzle: schema, migraciones, repositorios (impl. de puertos)
│  ├─ sources/        # Adapters de fuentes: gmail, getonboard, remotive, adzuna...
│  ├─ llm/            # Adapter Claude + prompts + guardrails + embeddings (Voyage/local)
│  ├─ documents/      # Generación CV/carta: plantillas ATS, docx, html→pdf
│  └─ shared/         # Tipos + esquemas Zod + utilidades compartidas
├─ docs/
│  ├─ PRD.md
│  └─ ARQUITECTURA.md
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ package.json
```

## 6. Diseño del dominio (puertos)

El core define **entidades** y **puertos** (interfaces). La infraestructura los implementa.

```ts
// packages/core/ports.ts  (ilustrativo)

export interface JobSourcePort {
  readonly name: string;
  readonly kind: 'email' | 'api' | 'rss';
  fetch(since: Date): Promise<RawJob[]>;   // trae vacantes crudas
}

export interface EmailReaderPort {
  search(query: string, since: Date): Promise<EmailMessage[]>;
  createDraft(draft: OutgoingEmail): Promise<{ id: string }>;
  send?(draft: OutgoingEmail): Promise<{ id: string }>;   // opcional, opt-in
}

export interface LlmPort {
  extractJobs(emailBody: string): Promise<RawJob[]>;       // parsing robusto
  scoreJob(job: Job, profile: Profile): Promise<JobScore>; // capa 3 del embudo
  tailorCv(job: Job, profile: Profile, lang: Lang): Promise<TailoredCv>;
  tailorCoverLetter(job: Job, profile: Profile, lang: Lang): Promise<string>;
}

export interface EmbedderPort {
  embed(texts: string[]): Promise<number[][]>;
}

export interface JobRepository {
  upsert(job: Job): Promise<void>;
  findCandidates(filter: HardFilter): Promise<Job[]>;
  nearest(profileEmbedding: number[], limit: number): Promise<Job[]>; // pgvector
}

export interface DocumentGenerator {
  toPdf(doc: ResumeDoc | CoverDoc): Promise<Buffer>;
  toDocx(doc: ResumeDoc | CoverDoc): Promise<Buffer>;
}

export interface SubmitterPort {
  readonly channel: 'email' | 'greenhouse' | 'lever' | 'assisted';
  canHandle(job: Job): boolean;
  submit(pkg: ApplicationPackage): Promise<SubmissionResult>;
}
```

**Casos de uso** (en `core`, orquestados por `apps/api` y `apps/worker`):
`IngestJobs` · `NormalizeAndDedup` · `ScoreJobs` · `TailorDocuments` ·
`PrepareApplicationPackage` · `SubmitApplication` · `TrackOutcome` · `LearnFromOutcomes`.

## 7. Diseño por etapa

| # | Etapa | Puerto(s) | Adapter(s) | Entrada → Salida |
|---|---|---|---|---|
| 1 | Fuentes | `JobSourcePort` | `GmailSource`, `GetOnBoardSource`, `RemotiveSource`, `AdzunaSource` | config → `RawJob[]` |
| 2 | Ingesta + Normalización | `LlmPort`, `JobRepository` | `ClaudeLlm`, `DrizzleJobRepository` | `RawJob[]` → `Job` normalizado + dedup |
| 3 | Matching (embudo) | `JobRepository`, `EmbedderPort`, `LlmPort` | `Voyage/LocalEmbedder`, `ClaudeLlm` | `Job[]` → `JobScore[]` (apply/maybe/skip) |
| 4 | Tailoring | `LlmPort`, `DocumentGenerator` | `ClaudeLlm`, `DocxGenerator`, `PdfGenerator` | `Job` + `Profile` → CV/carta ES/EN |
| 5 | Revisión humana | (UI) | `apps/web` | paquete → aprobado / editado |
| 6 | Postulación | `SubmitterPort` | `EmailSubmitter`, `GreenhouseSubmitter`, `AssistedSubmitter` | paquete → `SubmissionResult` |
| 7 | Tracking + Aprendizaje | `JobRepository`, `EmailReaderPort` | `DrizzleRepo`, `GmailSource` | eventos → métricas + sugerencias |

## 8. El embudo híbrido por capas (matching)

Materializa la decisión **D1**: filtrar masivo barato, adaptar caro solo el top.

```
N vacantes (cientos/día)
   │  Capa 1 — REGLAS (coste 0)
   │  ubicación, modalidad, seniority, idioma, salario, deal-breakers
   ▼
~decenas
   │  Capa 2 — EMBEDDINGS (coste muy bajo)
   │  similitud coseno perfil↔vacante (pgvector) → top N (p.ej. 20)
   ▼
top N
   │  Capa 3 — LLM SCORING (coste medio, solo top N)
   │  Claude con rúbrica → score, gaps, keywords faltantes, apply/maybe/skip + porqué
   ▼
"apply" (unos pocos)
   │  Capa 4 — TAILORING (coste alto, solo apply)
   │  CV + carta adaptados a fondo, ES/EN
   ▼
Paquetes listos para revisión humana
```

El "embedding de perfil" se construye a partir del resumen + bullets más representativos (o un
promedio ponderado de embeddings de bullets). Los embeddings de vacantes se calculan en ingesta y
se guardan en `pgvector` con índice HNSW.

## 9. Modelo de datos

Esquema relacional en Postgres (Drizzle). Vectores en columnas `vector` (pgvector).

```
profile           (1)  id, full_name, email, phone, links(jsonb),
                       summary_es, summary_en, preferences(jsonb), updated_at
experience        (N)  id, profile_id→profile, kind(job|project|education),
                       organization, title, location, url, start_date, end_date
bullet            (N)  id, profile_id→profile, experience_id→experience (NOT NULL,
                       cascade), text_es, text_en, skills(text[]),
                       category(experience|achievement), metrics(jsonb), embedding vector
source            (N)  id, name, kind(email|api|rss), config(jsonb), enabled
email_message     (N)  id, gmail_id, from_addr, subject, received_at, parsed(jsonb)
job               (N)  id, source_id→source, external_id, title, company, location,
                       modality, seniority, description, url, salary(jsonb),
                       posted_at, raw(jsonb), dedup_hash, embedding vector,
                       status, ingested_at
job_score         (N)  id, job_id→job, layer(rules|embedding|llm), score,
                       reasons(jsonb), missing_keywords(text[]),
                       decision(apply|maybe|skip), model, created_at
document          (N)  id, job_id→job, type(cv|cover), lang(es|en),
                       content(jsonb), file_path, version, created_at
application       (N)  id, job_id→job, channel(email|greenhouse|lever|assisted),
                       status, cv_document_id, cover_document_id,
                       answers(jsonb), submitted_at
application_event (N)  id, application_id→application, type, payload(jsonb), occurred_at
llm_usage         (N)  id, op, model, input_tokens, output_tokens, cost_estimate, created_at
```

**`experience` como contenedor**: `organization`/`title` se reinterpretan según `kind`
(empresa/rol, contexto/proyecto, institución/título) en vez de columnas específicas por
tipo — job/project/education comparten toda propiedad relevante. Todo `bullet` pertenece
a un `experience`; no existe el bullet suelto (ADR-0028).

**Estados de `application`**: `prepared → submitted → acknowledged → (rejected | interview →
offer | ghosted)`. Cada transición es un `application_event` (línea de tiempo + analítica).

**Dedup (`dedup_hash`)**: hash normalizado de `(empresa + título + ubicación)` con limpieza de
texto; las vacantes equivalentes de distintas fuentes colapsan a una, conservando todas las URLs.

## 10. Integraciones externas

| Servicio | Uso | Auth | Notas |
|---|---|---|---|
| **Gmail API** | Leer alertas, detectar respuestas, crear borradores/enviar | OAuth2 (scopes mínimos: `gmail.readonly`, `gmail.compose`) | Lectura ToS-safe; envío opt-in. |
| **Google Docs/Drive** | Importar el CV existente ES/EN | OAuth2 (`drive.readonly`/`documents.readonly`) | Para poblar perfil y bullets. |
| **GetOnBoard / Remotive / Adzuna / Arbeitnow / RemoteOK** | Ingesta de vacantes | API key / pública | APIs oficiales; verificar términos al integrar. |
| **ATS (Greenhouse / Lever)** | Ingesta y, donde exista, **postulación por API** | Token por empresa | Postulación por API solo donde el ATS lo expone; si no, modo asistido. |
| **Claude (`@anthropic-ai/sdk`)** | Extracción, scoring, tailoring | API key | Modelos por nivel + *prompt caching*. |
| **Voyage AI** (o local) | Embeddings | API key (o local sin red) | Local-first posible con `fastembed`/Transformers.js. |

**LinkedIn / Indeed**: solo vía sus **alertas por correo** (ingesta). No hay API de búsqueda para
individuos y el scraping viola sus ToS → **excluidos como canal de envío** (modo asistido).

**Flujo OAuth** (Google): autorización local con `redirect_uri` a `localhost`; *refresh token*
cifrado en reposo; renovación automática. Scopes mínimos por principio de menor privilegio.

## 11. Generación de documentos ATS-friendly

Pipeline: **datos estructurados → plantilla → render**.

- **Reglas ATS**: una sola columna, sin tablas/imágenes/iconos, fuentes estándar, encabezados
  convencionales (Experiencia, Educación, Skills), texto **seleccionable** (no imagen).
- **DOCX**: librería `docx` (algunos ATS prefieren `.docx`).
- **PDF**: plantilla HTML/Handlebars → **Puppeteer** (headless Chrome) → PDF con texto real.
- **Guardrails (RF-17)**: el LLM solo **selecciona y reformula** bullets existentes y alinea
  keywords; un validador comprueba que no aparezcan datos fuera del banco de bullets/perfil.
- **Versionado**: cada documento guarda `version` → habilita el A/B testing por versión de CV (RF-26).

## 12. Estrategia de postulación (decisión D2)

Tres `SubmitterPort` priorizados por `canHandle(job)`:

1. **`EmailSubmitter`** — vacantes con correo de aplicación: redacta el mensaje + adjunta CV/carta
   → por defecto **crea borrador en Gmail** (revisas y envías); envío directo es opt-in.
2. **`AtsApiSubmitter`** (Greenhouse/Lever donde aplique) — postula vía API oficial.
3. **`AssistedSubmitter`** (fallback de primera clase) — para LinkedIn/Indeed/formularios propios:
   genera el paquete + checklist de respuestas y **abre el enlace**; el usuario aplica. Se registra
   igual para no perder trazabilidad.

> Ningún canal automatiza acciones que violen ToS. Esto cumple D2 (cero baneos).

## 13. Seguridad y privacidad

- **Sin contraseñas**: solo OAuth2 con scopes mínimos.
- **Secretos cifrados** en reposo (Node `crypto`/libsodium o keychain del SO); `.env` validado con
  Zod y fuera de git.
- **Local-first**: Postgres local; los datos personales no se exponen a terceros salvo a las APIs
  estrictamente necesarias.
- **Minimización ante el LLM**: se envía el JD + bullets relevantes, no PII innecesaria (sin
  teléfono/dirección en los prompts de scoring).
- **Auditoría**: `application_event` + `llm_usage` dan trazabilidad completa.

## 14. Observabilidad y control de costos

- **Logs** estructurados con `pino` (correlación por job/application).
- **Costos LLM**: tabla `llm_usage` (tokens y coste estimado por operación); **presupuesto diario**
  con corte automático; **prompt caching** del system + perfil para abaratar repeticiones.
- **Métricas de negocio**: tasa de respuesta por fuente/rol/versión de CV (RF-26), expuestas en
  el dashboard de `apps/web`.

## 15. Escalabilidad y evolución

- **Nuevas fuentes**: implementar `JobSourcePort` y registrar el adapter (open/closed).
- **Workers**: BullMQ escala por concurrencia/colas; ingesta, scoring y tailoring son colas
  independientes.
- **Datos**: pgvector con índice HNSW; Postgres admite réplicas de lectura si crece.
- **Multi-usuario (futuro)**: el modelo ya referencia `profile_id`; añadir auth + aislamiento por
  tenant. No se construye ahora (fuera de alcance del PRD §5).

## 16. Testing y calidad

- **Unitarias** (Vitest) del dominio y casos de uso con puertos *mockeados*.
- **Pruebas por remitente** del parser de correos (fixtures de cada plataforma) → robustez RNF-07.
- **Contract tests** de cada adapter de fuente contra esquemas Zod.
- **Integración** de `api` con Supertest; e2e ligeros de la UI con Playwright (solo testing).
- **Calidad**: ESLint + Prettier + `tsc --noEmit` en CI; `strict: true`.

## 17. Despliegue (local-first)

`docker-compose.yml` con: `postgres` (imagen con pgvector), `redis`, `api`, `worker`, `web`.
Migraciones Drizzle al arrancar. Variables en `.env` (validadas con Zod). Un comando levanta todo.

## 18. Decisiones de arquitectura (ADRs)

| ADR | Decisión | Motivo |
|---|---|---|
| 001 | Node + TS con **NestJS** | DI/modularidad → mapea a hexagonal; alineado con D3. |
| 002 | **Postgres + pgvector + Drizzle** | Relacional + vectorial en un motor; SQL-first ligero. |
| 003 | **Claude** (razonamiento) + **Voyage/local** (embeddings) | Anthropic no da embeddings propios; separar responsabilidades. |
| 004 | **BullMQ + Redis** | Jobs robustos: reintentos, scheduling, concurrencia. |
| 005 | Envío solo **email + API**; resto **asistido** | Cumple D2; cero riesgo de baneo/ToS. |
| 006 | **Local-first + OAuth**, sin scraping de LinkedIn | Privacidad + cumplimiento. |
| 007 | Documentos **datos→plantilla→PDF/DOCX** ATS | Texto seleccionable, versionable, A/B testeable. |
| 008 | **Monorepo pnpm** + tipos compartidos | Coherencia de tipos end-to-end. |

## 19. Próximos pasos técnicos

1. Validar/ajustar este documento contigo.
2. (Opcional) **Diagrama de secuencia** detallado de una fase (p. ej. Fase 1 tailoring).
3. (Opcional) **Esqueleto del monorepo** (estructura + tsconfig + lint + docker-compose), aún sin
   lógica de negocio.
4. Empezar **Fase 1** (Perfil + Adaptación) según el roadmap del PRD.
