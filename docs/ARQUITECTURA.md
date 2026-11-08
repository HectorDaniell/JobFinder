# JobFinder — Arquitectura Técnica

> Estado: **Vigente** · Versión 0.2 · Actualizado 2026-08-23
> Documento de producto: [PRD.md](./PRD.md) · Recorrido end-to-end: [FLUJO.md](./FLUJO.md)
>
> Este documento describe el diseño **vigente**, no el original. Donde lo construido
> se desvió del plan de junio, manda lo construido y se cita el ADR que lo decidió.
> Lo que aún no existe va marcado con ⬜ para que no se confunda un plan con un hecho.

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
| Documentos CV | **`docx`** (DOCX) + **`pdfkit`** (PDF) | Texto seleccionable, ATS-friendly. Se eligió `pdfkit` sobre Puppeteer para no arrastrar Chromium (ADR-0014); ambos formatos parten del mismo modelo intermedio (ADR-0015), sin plantillas HTML. |
| Frontend | **Next.js (App Router)** + Tailwind | UI simple; comparte tipos del monorepo. |
| Logging | **pino** | Logs estructurados de alto rendimiento. |
| Tests | **Vitest** (+ `app.inject()` de Fastify) | Rápido, TS nativo. Los e2e de la API usan el `inject` nativo de Fastify, no Supertest: levanta el contenedor real de Nest sin abrir un puerto. |
| Calidad | **ESLint + Prettier + tsconfig strict** | Consistencia y seguridad de tipos. |
| Empaquetado | **Docker + docker-compose** | Postgres+pgvector, Redis y apps reproducibles. |

## 5. Estructura del monorepo

```
jobfinder/
├─ apps/
│  ├─ api/            # NestJS: REST + orquestación de casos de uso
│  ├─ worker/     ⬜  # NestJS standalone + BullMQ. Solo esqueleto (main + app.module)
│  └─ web/            # Next.js: perfil, historial, bullets, tailor. Bandeja/dashboards ⬜
├─ packages/
│  ├─ core/           # DOMINIO: entidades, value objects, PUERTOS, casos de uso (sin infra)
│  ├─ db/             # Drizzle: schema, migraciones, repositorios
│  ├─ sources/    ⬜  # Adapters de fuentes: gmail, bolsas, ATS. VACÍO hoy
│  ├─ llm/            # Adapter Claude + prompts + guardrails. Embeddings ⬜
│  ├─ documents/      # Generación CV/carta: modelo intermedio → docx / pdfkit
│  └─ shared/     ⬜  # Utilidades compartidas. VACÍO hoy
├─ docs/              # PRD · ARQUITECTURA · ROADMAP · PROGRESS · FLUJO · SETUP · adr/
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ package.json
```

## 6. Diseño del dominio (puertos)

El core define **entidades** y **puertos** (interfaces). La infraestructura los implementa.
Lo de abajo son los puertos **que existen hoy** en `packages/core/src/ports/`, con su
firma real. Los planificados van aparte, al final, para no confundirlos con lo construido.

```ts
// La ingesta son DOS puertos, no uno: descubrir ≠ enriquecer (ADR-0029).

export interface JobSourcePort {          // DESCUBRIR: ¿qué vacantes existen?
  readonly name: string;
  readonly kind: 'email' | 'api' | 'rss';
  fetch(since: Date): Promise<RawJob[]>;  // RawJob.description es OPCIONAL
  test(): Promise<{ ok: boolean; error?: string }>;
}

export interface JobEnricherPort {        // ENRIQUECER: ¿qué dice esa vacante?
  readonly name: string;                  // qué paso de la cascada resolvió: se mide
  enrich(job: Job): Promise<EnrichmentResult | null>;  // null = "no es mía"
}

// SOLO LECTURA, y es una decisión de seguridad, no una omisión: el camino de
// ingesta nunca debe sostener una credencial capaz de enviar correo. Cuando la
// Fase 3 necesite crear borradores, será OTRO puerto con OTRO scope de OAuth.
export interface EmailReaderPort {
  search(query: string, since: Date): Promise<EmailMessage[]>;
  test(): Promise<{ ok: boolean; error?: string }>;
}

export interface LlmPort {
  extractJobs(rawText: string): Promise<ExtractedJob[]>;    // ⬜ stub
  scoreJob(job: Job, profile: Profile): Promise<JobScore>;  // ⬜ stub
  tailorCv(job: Job, profile: Profile, lang: Lang): Promise<TailoredCv>;
  tailorCoverLetter(job: Job, profile: Profile, lang: Lang): Promise<string>;
}

export interface EmbedderPort {           // ⬜ sin adapter todavía (Capa 2)
  embed(texts: string[]): Promise<number[][]>;
  embedOne(text: string): Promise<number[]>;
  similarity(vecA: number[], vecB: number[]): number;
}

export interface DocumentPort {
  generateCv(cv, profile, experiences, lang, format): Promise<DocumentArtifact>;
  generateCoverLetter(letter, profile, lang, format): Promise<DocumentArtifact>;
}
```

**Los repositorios no son puertos del core.** `packages/db` expone clases concretas
(`ProfileRepository`, `JobRepository`…) y quien las necesita declara **su propia
interfaz mínima**, definida por el consumidor: `TailorDocuments` pide un
`ProfileProvider { findById }`, no un repositorio entero. Así el core no arrastra
métodos que no usa y los tests se doblan con tres líneas. Ver ADR-0011.

**Puertos planificados** (aún sin escribir): `SubmitterPort` (canal de postulación,
Fase 3).

**Casos de uso.** Solo `TailorDocuments` existe. Los demás son plan:
⬜ `IngestJobs` · ⬜ `EnrichJob` · ⬜ `NormalizeAndDedup` · ⬜ `ScoreJobs` ·
✅ `TailorDocuments` · ⬜ `PrepareApplicationPackage` · ⬜ `SubmitApplication` ·
⬜ `TrackOutcome` · ⬜ `LearnFromOutcomes`.

## 7. Diseño por etapa

| # | Etapa | Puerto(s) | Adapter(s) | Entrada → Salida | Estado |
|---|---|---|---|---|---|
| 1 | Descubrimiento | `JobSourcePort`, `EmailReaderPort` | `GmailSource`, `RemotiveSource`, `AdzunaSource` | config → `RawJob[]` **delgados** | ⬜ |
| 2 | Normalización + dedup | (repos de `db`) | `JobRepository` | `RawJob[]` → `Job` normalizado, deduplicado | ⬜ |
| 3 | Matching · Capa 1 (reglas) | (repos de `db`) | `JobRepository` | `Job[]` → los que cumplen preferencias duras | ⬜ |
| 4 | **Enriquecimiento** | `JobEnricherPort` | `AtsEnricher`, `JsonLdEnricher`, `CaptureEnricher` | `Job` delgado → `Job` con descripción | ⬜ |
| 5 | Matching · Capas 2–3 | `EmbedderPort`, `LlmPort` | `Voyage/LocalEmbedder`, `ClaudeAdapter` | `Job[]` → `JobScore[]` (apply/maybe/skip) | ⬜ |
| 6 | Tailoring | `LlmPort`, `DocumentPort` | `ClaudeAdapter`, `DocumentAdapter` | `Job` + `Profile` → CV/carta ES/EN | ✅ |
| 7 | Revisión humana | (UI) | `apps/web` | paquete → aprobado / editado | ✅ |
| 8 | Postulación | `SubmitterPort` | `EmailSubmitter`, `AtsApiSubmitter`, `AssistedSubmitter` | paquete → `SubmissionResult` | ⬜ |
| 9 | Tracking + Aprendizaje | (repos), `EmailReaderPort` | `DrizzleRepo`, `GmailSource` | eventos → métricas + sugerencias | ⬜ |

El enriquecimiento (4) va **entre** la Capa 1 y la Capa 2 a propósito: es la decisión
que contiene el costo de la Fase 2. Ver §8 y ADR-0029.

## 8. El embudo híbrido por capas (matching)

Materializa la decisión **D1**: filtrar masivo barato, adaptar caro solo el top.

```
N vacantes DELGADAS (cientos/día)
   │  Capa 0 — DEDUP (coste 0)
   │  la misma vacante vista en tres fuentes colapsa a una
   ▼
   │  Capa 1 — REGLAS (coste 0, solo metadatos)
   │  ubicación, modalidad, seniority, idioma, salario, deal-breakers
   ▼
~decenas
   │  ENRIQUECIMIENTO — cascada que degrada (ADR-0029)
   │  ① ya venía completa · ② ATS pública · ③ JSON-LD de la empresa 🟡 · ④ captura asistida
   ▼
~decenas, ya con su descripción
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

**Por qué el enriquecimiento va ahí y no antes.** La Capa 1 solo mira metadatos
(ubicación, modalidad, salario), que el correo de alerta **sí trae**. No necesita el
texto de la oferta. Enriquecer antes de filtrar sería pagar peticiones —y, en los
pasos ③–④, tokens— por vacantes que se iban a descartar de todos modos. Colocarlo
después convierte "cientos de peticiones" en "unas pocas decenas".

El "embedding de perfil" se construye a partir del resumen + bullets más representativos (o un
promedio ponderado de embeddings de bullets). Los embeddings de vacantes se calculan **tras el
enriquecimiento** (sin descripción no hay nada que embeber) y se guardan en `pgvector` con
índice HNSW. ⬜ pgvector todavía no está habilitado: la columna `embedding` no existe aún.

## 9. Modelo de datos

Esquema relacional en Postgres (Drizzle). **10 tablas existentes**, tal como están en
`packages/db/src/schema.ts` (migraciones `0000`–`0004`):

```
profile           (1)  id, full_name, email, phone, links(jsonb),
                       summary_es, summary_en, preferences(jsonb), updated_at
experience        (N)  id, profile_id→profile, kind(job|project|education),
                       organization, title, location, url, start_date, end_date
bullet            (N)  id, profile_id→profile, experience_id→experience (NOT NULL,
                       cascade), text_es, text_en, skills(text[]),
                       category(experience|achievement), metrics(jsonb)
source            (N)  id, name, kind(email|api|rss), config(jsonb), enabled
job               (N)  id, source_id→source, external_id, title, company, location,
                       modality, seniority, description (NULLABLE), url, salary(jsonb),
                       posted_at, raw(jsonb), dedup_hash (UNIQUE),
                       enrichment_failed(bool), enriched_by, ingested_at
job_score         (N)  id, job_id→job, layer(rules|embedding|llm), score,
                       decision(apply|maybe|skip), reasoning, missing_keywords(text[]),
                       gap_analysis, model, created_at
document          (N)  id, job_id→job, type(cv|cover), lang(es|en),
                       content(jsonb), file_path, version, created_at
application       (N)  id, job_id→job, channel(email|greenhouse|lever|assisted),
                       status, cv_document_id, cover_document_id,
                       answers(jsonb), submitted_at
application_event (N)  id, application_id→application, type, payload(jsonb), occurred_at
llm_usage         (N)  id, op, model, input_tokens, output_tokens, cost_estimate, created_at
```

**Tablas planificadas, aún sin crear** (⬜ Fase 2/3):

```
email_message     (N)  id, gmail_id, from_addr, subject, received_at, parsed(jsonb)
company_ats       (N)  id, company, provider(greenhouse|lever|ashby|…), board_token
job_source_link   (N)  id, job_id→job, source_id→source, url   ← una vacante, varias URLs
```

`company_ats` es el activo que **compone**: resuelta una empresa una vez, todas sus
vacantes futuras se enriquecen gratis (ADR-0029).

> **Columnas `vector` (pgvector): todavía no existen.** Ni `bullet.embedding` ni
> `job.embedding`. Se añaden cuando se implemente la Capa 2; hasta entonces
> `EmbedderPort` no tiene adapter y el diseño vectorial es plan, no hecho.

> **`document` existe como tabla pero nadie escribe en ella.** Persistir los archivos
> generados (`DocumentRepository`) está diferido a la Fase 3. Lo mismo con `llm_usage`:
> la tabla está, pero el `usageSink` del `CostLogger` no está cableado a ningún
> repositorio, así que el KPI de coste por tailor **no se puede medir hoy**.

**`experience` como contenedor**: `organization`/`title` se reinterpretan según `kind`
(empresa/rol, contexto/proyecto, institución/título) en vez de columnas específicas por
tipo — job/project/education comparten toda propiedad relevante. Todo `bullet` pertenece
a un `experience`; no existe el bullet suelto (ADR-0028).

**Estados de `application`**: `prepared → submitted → acknowledged → (rejected | interview →
offer | ghosted)`. Cada transición es un `application_event` (línea de tiempo + analítica).

**Dedup (`dedup_hash`)**: hash normalizado de `(empresa + título + ubicación)` con limpieza de
texto; las vacantes equivalentes de distintas fuentes colapsan a una, conservando todas las URLs.

> ⬜ **Hoy es un placeholder.** `Job.generateDedupHash` normaliza y concatena, pero
> **no hashea** (su propio comentario lo dice: *"in production, use crypto.createHash"*).
> Funciona como clave única, pero mete el texto entero en un índice UNIQUE. Conservar
> todas las URLs necesita además `job_source_link`, que no existe. Ambos son trabajo de
> la Fase 2, cuando el dedup deje de ser teórico porque haya varias fuentes reales.

## 10. Integraciones externas

| Servicio | Uso | Auth | Notas |
|---|---|---|---|
| **Gmail API** | **Descubrir**: leer alertas. Fase 3: detectar respuestas | OAuth2, `gmail.readonly` | La ingesta usa **solo lectura**. El scope `gmail.compose` llega en la Fase 3, con otro puerto — ver §6. |
| **Google Docs/Drive** | Importar el CV existente ES/EN (RF-04) | OAuth2 (`drive.readonly`/`documents.readonly`) | Para poblar perfil y bullets. ⬜ pendiente desde la Fase 1. |
| **Bolsas con API** (Remotive, Himalayas, Arbeitnow, Jobicy, RemoteOK, Get on Board) | **Descubrir**, ya con el JD completo | API key / pública | Son buscables *y* traen descripción: no necesitan enriquecimiento. |
| **Agregadores** (Adzuna) | **Descubrir** solamente | API key | Truncan la descripción **por modelo de negocio** (quieren el clic). Nunca sirven para enriquecer. |
| **ATS públicas** (Greenhouse, Lever, Ashby, Workable, Recruitee, Personio) | **Enriquecer**. Fase 3: postulación por API donde exista | Sin auth para leer; token por empresa | **No son buscables**: no existe "dame todas las vacantes de Greenhouse", hay que saber ya por qué empresa preguntas. Por eso nunca descubren. ADR-0029. |
| **Claude (`@anthropic-ai/sdk`)** | Extracción, scoring, tailoring | API key | Modelos por nivel + *prompt caching*. |
| **Voyage AI** (o local) | Embeddings | API key (o local sin red) | Local-first posible con `fastembed`/Transformers.js. |

**LinkedIn / Indeed**: solo vía sus **alertas por correo** (ingesta). No hay API de búsqueda para
individuos y el scraping viola sus ToS → **excluidos como canal de envío** (modo asistido).

**Flujo OAuth** (Google): autorización local con `redirect_uri` a `localhost`; *refresh token*
cifrado en reposo; renovación automática. Scopes mínimos por principio de menor privilegio.

## 11. Generación de documentos ATS-friendly

Pipeline: **datos estructurados → modelo intermedio → exporter**. No hay plantillas
HTML: el plan original (Handlebars → Puppeteer) se descartó al elegir `pdfkit`, y
`handlebars` se retiró de las dependencias en el Sprint 3.

- **Reglas ATS**: una sola columna, sin tablas/imágenes/iconos, fuentes estándar, encabezados
  convencionales (Experiencia, Educación, Skills), texto **seleccionable** (no imagen).
- **Modelo intermedio** (`ResumeModel` / `CoverLetterModel`): mappers puros que deciden *qué*
  va en el documento, una sola vez, con independencia del formato. ADR-0015.
- **DOCX**: librería `docx` — árbol declarativo → `Packer.toBuffer`.
- **PDF**: `pdfkit` — stream imperativo → `Buffer.concat`. Sin Chromium. ADR-0014.
- **Composición en `core`, no en el LLM**: el historial completo, la formación y las
  habilidades son **hechos** del perfil y los pone `TailorDocuments`; el LLM solo elige y
  reformula bullets. Ningún contenedor queda mudo (ADR-0026, ADR-0027, ADR-0028).
- **Guardrails (RF-17)**: el LLM solo **selecciona y reformula** bullets existentes; el
  validador de origen (coeficiente de **contención**, ADR-0023) comprueba que cada bullet
  procede del banco, y descarta solo el que falle en vez de tumbar el CV entero (ADR-0025).
- ⬜ **Versionado**: la columna `document.version` existe, pero **nada persiste documentos
  todavía**. El A/B testing por versión de CV (RF-26) depende de `DocumentRepository` → Fase 3.

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

**Hoy: 128 tests verdes** — `core` 18 · `llm` 37 · `documents` 25 · `api` 48.

- **Unitarias** (Vitest) del dominio y casos de uso con puertos *doblados* a mano (sin
  librería de mocks: los puertos son pequeños justamente para eso).
- **Integración** de `api` con `app.inject()` de Fastify: levanta el contenedor real de
  Nest sin abrir un puerto. No se usa Supertest.
- **Calidad**: ESLint + Prettier + `tsc --noEmit`; `strict: true`. `pnpm type-check`
  cubre `src`, `tests` y `scripts` de los packages, más las tres apps con su propia config.

**Huecos conocidos** (deuda reconocida, no olvidada):

- ⬜ **`packages/db` no tiene ni un test**, ni script `test`. El Sprint 1 dio por
  entregada una cobertura de repositorios que nunca se escribió. Los repos se ejercitan
  hoy solo de forma indirecta, a mano contra Postgres.
- ⬜ **`apps/web` no tiene tests automatizados**. Se verifica con recorridos reales en
  navegador. Un bug de navegación en móvil ya se escapó por aquí (Sprint 5).
- ⬜ **Pruebas por remitente** del parser de correos (fixtures por plataforma) → es el
  primer entregable de la Fase 2 y lo que hará cumplir RNF-07.
- ⬜ **Contract tests** de cada adapter de fuente contra esquemas Zod.
- ⚠️ **`pnpm test` en la raíz arranca Vitest en modo *watch*** (el script es `vitest`, sin
  `run`) y no termina. No hay un comando único que corra la suite completa; hay que ir
  package por package con `pnpm --filter <pkg> run test`.

## 17. Despliegue (local-first)

**Hoy** `docker-compose.yml` levanta solo la **infraestructura**: `db` (Postgres 16, `:5433`)
y `redis` (`:6379`). Las tres apps se ejecutan fuera del contenedor, con `pnpm run dev:*`
(ver [SETUP.md](./SETUP.md)), que es lo cómodo mientras se desarrolla.

Las migraciones **no** corren al arrancar: son un paso explícito (`pnpm run migrate`), y el
runner registra las aplicadas en `drizzle.__drizzle_migrations`, así que repetirlo no hace daño.

⬜ Empaquetar `api`, `worker` y `web` como servicios del compose queda para cuando el
worker tenga contenido real (Fase 2).

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

Estas ocho son las **fundacionales**, y viven resumidas aquí. Las decisiones posteriores
tienen archivo propio: **ADR-0009 a ADR-0029**, indexadas en
[`docs/adr/README.md`](./adr/README.md). Varias de ellas corrigen a este documento —
`pdfkit` sobre Puppeteer (0014), la ingesta en dos tiempos (0029)— y en cada caso manda
el ADR, que es posterior.

## 19. Próximos pasos técnicos

La Fase 1 está construida y en uso real. Lo que sigue es la **Fase 2 (ingesta)**, en el
orden que impone ADR-0029 — primero lo que no necesita credenciales:

1. **Parsers deterministas por remitente** (LinkedIn, Glassdoor) como funciones puras,
   con fixtures de correos reales saneados. Sin red, sin Gmail, sin LLM.
2. **Enrichers de ATS** (Greenhouse, Lever, Ashby): verificables contra endpoints
   públicos reales, sin credenciales.
3. **`GmailSource`** + OAuth (RF-05), tabla `email_message`, caso de uso `IngestJobs`
   y un `dedup_hash` de verdad.
4. **`EnrichJob`**: la cascada completa + caché `company_ats`.
5. **`POST /capture`** + bookmarklet, con los endurecimientos de ADR-0029.
6. **El embudo**: Capa 1 (reglas) → Capa 2 (embeddings + pgvector) → Capa 3 (`scoreJob`,
   hoy un stub) → bandeja priorizada en `apps/web`.
7. **`apps/worker`** deja de ser un esqueleto: colas BullMQ de ingesta, enriquecimiento
   y scoring.
