# JobFinder — Progreso de implementación

> Fecha de inicio: 2026-06-22 · Última actualización: 2026-07-08

---

## Sprint 0 — Setup inicial ✅ COMPLETADO

**Objetivo:** Entorno listo, dependencias instaladas, proyecto compila.

**Duración:** ~2 horas.

### Tareas completadas

#### ✅ 1. Verificar Docker
- Docker Desktop v29.5.3 instalado y corriendo
- Comando: `docker --version` → OK
- Comando: `docker compose --version` → OK
- Puerto 5433 (Postgres) y 6379 (Redis) confirmados

#### ✅ 2. Infraestructura Docker levantada
- `docker compose up -d` ejecutado correctamente
- Contenedores creados:
  - `jobfinder-db` (PostgreSQL 16 + pgvector) en puerto 5433
  - `jobfinder-redis` (Redis 7 Alpine) en puerto 6379
  - Red `jobfinder-net` creada
  - Volúmenes `pgdata` y `redisdata` creados
- Health checks iniciando (tolerancia normal)
- **Nota importante:** Puerto configurado en 5433 (no 5432) para evitar conflictos con proyectos de trabajo del usuario

#### ✅ 3. Instalar dependencias
- `npm install -g pnpm` → pnpm 11.8.0 instalado
- `pnpm install` ejecutado exitosamente
- 850 dependencias resueltas
- Notas de compatibilidad:
  - Voyage AI SDK removido temporalmente (no existe en npm registry; se usará en Fase 2)
  - Puppeteer removido temporalmente (se usará en Sprint 3, espacio en disco)
  - Builds nativos habilitados (NestJS, esbuild, msgpackr)

#### ✅ 4. Configurar TypeScript
- Agregado `baseUrl: "."` a todos los tsconfig.json (core, db, shared, llm, sources, documents)
- Root tsconfig.json ajustado:
  - Removido `rootDir` (no aplica en monorepo)
  - Agregado `baseUrl: "."`
  - Actualizado `include` a `["packages/*/src/**/*", "apps/*/src/**/*"]`
  - Mantenidos `paths` para imports de alias (`@jobfinder/*`)
- Removidas referencias a `pgvector` en schema (no soportado aún; se agregará en Fase 2)

#### ✅ 5. Compilar @jobfinder/core
- `pnpm --filter core run build` ejecutado exitosamente
- Output: `packages/core/dist/` generado
- Archivos compilados:
  - `domain/entities/Profile.ts` → Profile class
  - `domain/entities/Job.ts` → Job class
  - `domain/entities/Bullet.ts` → Bullet class
  - `domain/value-objects/JobScore.ts` → JobScore class
  - `ports/JobSourcePort.ts` → Interfaz de fuente de empleos
  - `ports/LlmPort.ts` → Interfaz de LLM
  - `ports/EmbedderPort.ts` → Interfaz de embeddings
  - `errors/DomainError.ts` → Errores del dominio
  - `index.ts` → Barrel export

#### ✅ 6. Type-check del proyecto completo
- `pnpm type-check` ejecutado sin errores
- Verificación exitosa de tipos en:
  - packages/core
  - packages/db
  - packages/shared
  - packages/llm
  - packages/sources
  - packages/documents
  - apps/api (estructura, aún sin código)
  - apps/worker (estructura, aún sin código)
  - apps/web (estructura, aún sin código)

#### ✅ 7. Crear configuración base
- ✅ `.env` creado desde `.env.example`
- ✅ `.eslintrc.js` configurado (TypeScript strict)
- ✅ `.prettierrc` configurado (formato estándar)
- ✅ `docker-compose.yml` sin sección `version` (obsoleta)
- ✅ `pnpm-workspace.yaml` configurado correctamente
- ✅ Builds nativos habilitados en workspace

#### ✅ 8. Documentación
- ✅ Este archivo (`PROGRESS.md`) creado
- ✅ [ROADMAP.md](./ROADMAP.md) con plan detallado de 5 sprints
- ✅ [STRUCTURE.md](../STRUCTURE.md) documentando estructura del monorepo
- ✅ [SETUP.md](./SETUP.md) con instrucciones de instalación
- ✅ Root [README.md](../README.md) actualizado

---

## Estado actual (POST Sprint 1)

### ✅ Lo que está listo
- ✅ Sprint 0: Entorno, Docker, monorepo, core domain
- ✅ Sprint 1: Repositorios + BD + migraciones + seed
  - ProfileRepository, BulletRepository, JobRepository implementados
  - Schema Drizzle con todas las tables (profile, bullet, job, job_score, application, etc.)
  - Seed script con datos de prueba funcional
  - Migraciones ejecutadas, BD lista
- Docker Postgres + Redis corriendo
- Type-checking pasan 100%

### ⏳ Lo que sigue
- **Sprint 2:** Adapter de Claude (tailorCv, tailorCoverLetter) ← EN PLANNING
- **Sprint 3:** Generador de documentos (PDF, DOCX)
- **Sprint 4:** REST API (NestJS)
- **Sprint 5:** Frontend (Next.js)

---

## Checklist de Sprint 0

- [x] Docker instalado y corriendo
- [x] pnpm instalado
- [x] Dependencias del monorepo resueltas
- [x] TypeScript configurado correctamente
- [x] Core domain compila sin errores
- [x] Type-check pasa al 100%
- [x] Archivos de configuración (.env, ESLint, Prettier)
- [x] Documentación inicial completa
- [x] Roadmap de 5 sprints documentado

---

## Notas técnicas

### Variables de entorno (.env)
- `DATABASE_URL`: `postgresql://jobfinder:localdev@localhost:5433/jobfinder`
- `REDIS_URL`: `redis://localhost:6379`
- API keys de Anthropic y Voyage pendientes (no necesarias para Sprint 0)
- Google OAuth pendiente (Fase 2)

### Puertos
- **5433** — Postgres (JobFinder)
- **6379** — Redis (JobFinder)
- **3000** — Frontend Next.js (cuando se levante)
- **3001** — API NestJS (cuando se levante)

### Comandos útiles (Sprint 0)
```bash
# Levantar infraestructura
docker compose up -d
docker compose ps

# Verificar estado
docker compose logs db
docker compose logs redis

# Compilar core
pnpm --filter core run build

# Type-check
pnpm type-check

# Ver estructura del workspace
pnpm list --depth=0
```

### Decisiones de diseño (Sprint 0)
1. **TypeScript strict mode:** Forzado en tsconfig (`strict: true`)
2. **Alias imports:** Configurados (@jobfinder/*) para claridad
3. **Local-first BD:** Postgres local en Docker (no cloud)
4. **Sin pgvector aún:** Se agregará cuando Drizzle tenga soporte completo
5. **Minimalist dependencies:** Removidas librerías innecesarias para sprint 0 (Voyage, Puppeteer)

---

## Aclaraciones finales (Sprint 0)

### Estructura de repos
- **apps/**: Cada app (api, worker, web) tiene su `package.json` (✅ correcto)
- **node_modules/**: Solo UNO en la raíz (limpiamos los duplicados)
- **pnpm-lock.yaml**: Un solo archivo centralizado (versiona todo)

### Cómo levantar las apps (Sprint 1+)
**Opción A (recomendada):** 3 terminales con `pnpm run dev:api`, `pnpm run dev:worker`, `pnpm run dev:web`
**Opción B:** 1 terminal con `pnpm run dev` (paralelo)

Ambas funcionan. Opción A es más clara para desarrollo.

### Migraciones (solo DÍA 1)
`pnpm run migrate` se ejecuta **una sola vez** (crea las tablas). No lo repites mañana.
Solo la vuelves a ejecutar si borraste la BD o hay nuevas migraciones en el repo.

## Próxima sesión

Al iniciar la próxima sesión:
1. `docker compose up -d` para traer la BD online
2. `pnpm install` (debería estar en cache, es rápido)
3. Continuar con **Sprint 1: Repositorios**

Tiempo estimado Sprint 0 next run: < 1 minuto (solo levantar Docker).

---

## 📅 SESIÓN 2 — Sprint 0 completado + Skeleton de apps

**Fecha:** 2026-06-23 (continuación)

### ✅ Completado hoy

#### 6. Crear estructura mínima de apps
- ✅ `apps/api/src/main.ts` + `app.module.ts`
- ✅ `apps/worker/src/main.ts` + `app.module.ts`
- ✅ `apps/web/app/page.tsx` + `layout.tsx`
- ✅ `tsconfig.json` en cada app (override para CommonJS en NestJS)

#### 7. Resolver 4 configuraciones de setup
1. **node_modules duplicados en apps** → `.npmrc` con `shamefully-hoist=true`
2. **ESM vs CommonJS** → Override `module: "CommonJS"` en tsconfig de apps
3. **Sin driver HTTP en NestJS** → Pasar `FastifyAdapter` a `NestFactory.create()`
4. **Falta @types/node** → Agregar a root `package.json`

#### 8. Levantar y validar las 3 apps
- ✅ **api** corriendo en http://localhost:3001 (responde 404 = vivo)
- ✅ **worker** escuchando Redis sin errores
- ✅ **web** levantado en http://localhost:3000 con landing page visible

### 📚 Documentación de lecciones
Todas las 4 configuraciones son **estándares de la industria**:
- Monorepos profesionales siempre tienen `.npmrc`
- Todo proyecto Node+TypeScript tiene `@types/node`
- Elegir servidor explícitamente es el estándar en NestJS
- Override de tsconfig por app es la forma de separar concerns en workspaces

### ✅ Sprint 0 — Checklist final
- [x] Docker Postgres + Redis corriendo
- [x] pnpm install funcionando
- [x] TypeScript compilando sin errores
- [x] Core domain listo
- [x] Apps (api, worker, web) levantando y respondiendo
- [x] Configuración permanente (.npmrc, tsconfig, package.json)
- [x] Documentación completa (SETUP.md, ROADMAP.md, PROGRESS.md)

### 🚀 Sprint 0 = COMPLETAMENTE FUNCIONAL

---

## 📅 SESIÓN 3 — Sprint 1: Repositorios + BD + Seed

**Fecha:** 2026-06-24 (continuación)

### ✅ Sprint 1 — COMPLETADO

#### ✅ 1. Schema Drizzle y Migraciones
- `packages/db/src/schema.ts` con todas las tables:
  - `profile` (user data, preferences)
  - `bullet` (experiencia/logros con embeddings)
  - `source` (fuentes de empleo: gmail, APIs)
  - `job` (vacantes normalizadas, con dedup_hash)
  - `job_score` (scoring de matching por capas)
  - `application` (postulaciones registradas)
  - `application_event` (timeline de cada postulación)
  - `document` (CV/cover letter generados, versionados)
  - `llm_usage` (tracking de costos)
  - `email_message` (correos parseados)

#### ✅ 2. Repositories implementados
- **`ProfileRepository`** → CRUD perfil
- **`BulletRepository`** → CRUD bullets + búsqueda por profileId
- **`JobRepository`** → CRUD jobs + dedup + búsqueda por hash
- **`JobScoreRepository`** → CRUD de scores de matching
- (Application / Source / etc. tienen tabla en el schema pero aún no repositorio — Fase 2/3)

#### ✅ 3. Migraciones Drizzle
- `scripts/migrate.js` — ejecuta migraciones against Postgres
- Schema compilado, tablas creadas en BD local

#### ✅ 4. Seed Script
- `packages/db/scripts/seed.ts` → genera datos de prueba:
  - 1 Perfil (Daniel Developer, bilingüe, 5 años experiencia)
  - 5 Bullets (experiencia/logros/educación con skills etiquetados)
  - 1 Source (linkedin source simulada)
  - 3 Jobs de prueba (Senior Backend, Full Stack, DevOps)
- Ejecutable: `pnpm --filter db run seed`

#### ✅ 5. Estado de BD
- Postgres en 5433 ✅
- Redis en 6379 ✅
- Migraciones ejecutadas ✅
- Datos de prueba cargables ✅

### 📊 Deliverables Sprint 1
- ✅ Schema relacional completo (10 tables + relaciones)
- ✅ 4 Repositories implementados con métodos CRUD
- ✅ Migraciones automáticas funcionales
- ✅ Seed de datos para testing manual
- ✅ BD local lista para consumo

### Criterio de aceptación ✅
- `ProfileRepository.create(profile)` → perfil guardado ✅
- `ProfileRepository.findById(id)` → recupera con bullets ✅
- `JobRepository.findByDedupHash(hash)` → dedup funciona ✅
- `pnpm --filter db run seed` → datos en BD ✅

---

### 🚀 Sprint 1 = COMPLETAMENTE FUNCIONAL

**Próxima sesión:** Planning de Sprint 2 (Claude Adapter)

---

## 📅 SESIÓN 4 — Sprint 2: Claude Adapter (tailoring)

**Fecha:** 2026-06-28

### ✅ Sprint 2 — COMPLETADO

**Objetivo:** que el sistema adapte CV y carta a una vacante con Claude, sin inventar datos.

#### ✅ 1. Motor (`ClaudeClient`)
- Envuelve `@anthropic-ai/sdk`; único punto de entrada `complete()`.
- Retry con backoff exponencial (429/red), timeout por llamada, mapeo a errores tipados.
- Logging de costo por llamada (vía `CostLogger` + un `usageSink` opcional).

#### ✅ 2. Soporte
- **`CostLogger`** + tabla de precios (Sonnet 4.6 / Haiku 4.5 / Opus 4.8).
- **Errores tipados** con `statusCode` HTTP (InvalidAnthropicKey, LlmTimeout, RateLimit, CallFailed, MalformedLlmResponse, ProfileHasNoBullets, GuardrailViolation).
- **Guardrails**: schemas Zod (entrada/salida) + `BulletOriginValidator` (anti-invención, similitud Jaccard).
- **Prompts** como `.txt` versionados + `prompt-loader` (relleno puro y testeable).

#### ✅ 3. Adapter (`ClaudeAdapter implements LlmPort`)
- **`tailorCv`** ✅ — banco → prompt → motor → parseo → anti-invención → mapeo a `TailoredCv`.
- **`tailorCoverLetter`** ✅ — texto libre (temp 0.7), validación de longitud, sin anti-invención.
- **`scoreJob` / `extractJobs`** → stubs tipados (Fase 2).
- **`BulletProvider`** (puerto definido por el consumidor) → `llm` NO depende de `db`.

#### ✅ 4. Tests (Vitest)
- 32 tests en 5 archivos (puros + mockeados). Real Claude nunca se llama (dobles).
- Cobertura: **96% líneas · 90% ramas** (meta ~85% superada).
- Comandos: `pnpm --filter @jobfinder/llm test` · `test:coverage`.

#### ✅ 5. Documentación
- ADRs **0009–0012** (modelos, TailoredCv en core, BulletProvider, prompts `.txt`).
- READMEs de `packages/llm` y `packages/db` (deuda del Sprint 1 saldada).

#### 🔧 Reconciliaciones (deuda técnica saldada)
- `TailoredCv` duplicado → unificado como contrato único en `core`.
- Modelo del plan (`claude-3-5-sonnet-20241022`) estaba **retirado** → migrado a `claude-sonnet-4-6`.

### Criterio de aceptación ✅
- `ClaudeAdapter` cumple `LlmPort` (compila: `tsc` exit 0).
- Guardrail anti-invención rechaza bullets fabricados (test verde).
- 32 tests en verde, cobertura > 85%.

### ⏳ Lo que NO entra en Sprint 2 (siguiente)
- **Sprint 3 (DocGen)**: convertir `TailoredCv` + carta en PDF/DOCX ATS-friendly.
- Cablear `usageSink` a un `LlmUsageRepository` real (persistir costo en BD).
- Empaquetado: copiar `prompts/*.txt` al `dist/` para producción (ADR-0012).

---

### 🚀 Sprint 2 = COMPLETAMENTE FUNCIONAL

---

## 📅 SESIÓN 5 — Sprint 3: Generador de documentos (DocGen)

**Fecha:** 2026-07-01

### ✅ Sprint 3 — COMPLETADO

**Objetivo:** convertir el `TailoredCv` + la carta (Sprint 2) en archivos
descargables **PDF y DOCX** ATS-friendly, sin depender de `llm` ni `db`.

#### ✅ 1. Contrato (`DocumentPort` en core)
- `generateCv` / `generateCoverLetter` → `DocumentArtifact { bytes, mimeType, filename }`.
- `bytes: Uint8Array` (no `Buffer`) para mantener el core agnóstico a Node. ADR-0013.

#### ✅ 2. Modelo intermedio + mappers (puros)
- `ResumeModel` / `buildResumeModel` — qué va en el CV (decidido una vez).
- `CoverLetterModel` / `buildCoverLetterModel` — carta (header + párrafos).
- `buildHeader` — encabezado compartido CV/carta. ADR-0015.

#### ✅ 3. Exporters
- **DOCX** vía `docx` (árbol declarativo → `Packer.toBuffer`).
- **PDF** vía `pdfkit` (stream imperativo → Promise + `Buffer.concat`). ADR-0014.
- Ambos consumen el MISMO modelo: el pago del modelo intermedio.

#### ✅ 4. Adapter (`DocumentAdapter implements DocumentPort`)
- Orquesta: mapper → exporter según `format` → `DocumentArtifact` (+ `slugify` del filename).
- SIN inyección de dependencias: sus colaboradores son puros/locales (nada que mockear).

#### ✅ 5. Tests (Vitest)
- **20 tests** en 5 archivos, **sin mocks** (piezas reales; se verifican los bytes: `%PDF`/`PK`).
- Cobertura: **100%** (líneas, ramas, funciones).
- Comandos: `pnpm --filter @jobfinder/documents test` · `test:coverage`.

#### ✅ 6. Documentación y limpieza
- ADRs **0013–0015** (puerto, pdfkit, modelo intermedio).
- README de `packages/documents`.
- `handlebars` retirado (quedó sin uso al elegir `pdfkit`).

### Criterio de aceptación ✅
- `DocumentAdapter` cumple `DocumentPort` (compila: `tsc` exit 0).
- Genera PDF y DOCX válidos para CV y carta (firmas `%PDF`/`PK` verificadas en tests).
- 20 tests en verde, cobertura 100%.

### ⏳ Lo que NO entra en Sprint 3 (siguiente)
- **Persistencia**: `DocumentRepository` en `db` + guardar el artifact (Sprint 4, la API).
- Empaquetado de producción (compilar/copiar assets si hiciera falta).

---

### 🚀 Sprint 3 = COMPLETAMENTE FUNCIONAL

---

## 📅 SESIÓN 6 — Sprint 4: REST API (NestJS)

**Fecha:** 2026-07-08

### ✅ Sprint 4 — COMPLETADO

**Objetivo:** exponer los packages por HTTP para que un frontend pueda crear
perfiles, cargar bullets y adaptar CV+carta. La API es un adaptador de entrada:
traduce HTTP ⇆ packages, sin lógica de negocio propia.

#### ✅ 1. Caso de uso `TailorDocuments` (en core)
- Orquesta perfil → LLM (CV + carta en paralelo) → documentos por formato.
- `ProfileProvider` (puerto del consumidor) → core no depende de `db`.
- Fix: `instanceof` fiable en subclases de `DomainError` (`new.target.prototype`).

#### ✅ 2. Bootstrap NestJS + composition root
- `main.ts` (Fastify), `AppModule`, `InfraModule` (repos vía `useFactory`).
- `/health`. Monorepo unificado a **CommonJS** (compatibilidad con Nest).

#### ✅ 3. Validación + errores (transversal)
- `ZodValidationPipe` (por ruta) → 400; `DomainExceptionFilter` (global vía
  `APP_FILTER`) traduce `DomainError` → HTTP uniforme. ADR-0016.

#### ✅ 4. CRUD de Profile
- `POST/GET/PATCH/DELETE /profiles`; controller → repo directo (CRUD sin caso de
  uso). Pre-checks → 409 (email duplicado) / 404. Reutiliza `PreferenceSchema`.

#### ✅ 5. CRUD de Bullets (anidado)
- `/profiles/:profileId/bullets`; helper `getOwned` verifica pertenencia (acceso
  cruzado → 404). PATCH por merge (el repo recibe la entidad completa).

#### ✅ 6. `POST /tailor` (endpoint estrella)
- Construye un Job manual desde el body (se pega el JD; ToS-safe). Usa
  `TailorDocuments`. Devuelve preview + archivos en **base64**.
- **LLM perezoso** (`lazy-llm`): la API arranca sin `ANTHROPIC_API_KEY`. ADR-0017.

#### ✅ 7. Tests e2e (Fastify `app.inject`)
- Contenedor real de Nest + repos fake in-memory + `TailorDocuments` mockeado.
- DI vía `@Inject(Token)` explícito (esbuild no emite metadata). ADR-0018.

#### ✅ 8. Documentación
- ADRs **0016–0018**; `apps/api/README.md`; este PROGRESS.

### Tests
- **api: 34 tests** (pipe 3 · filter 4 · profiles 7 · bullets 10 · tailor 3 · e2e 7).
- Proyecto: **89 verdes** (core 3 · llm 32 · documents 20 · api 34).

### Criterio de aceptación ✅
- `POST /profiles` → 201; entrada inválida → 400; email duplicado → 409.
- `POST /profiles/:id/tailor` → 200 con cv/carta + archivos en base64.
- Errores tipados (no 500 genéricos); e2e en verde arrancando la app real.

### ⏳ Lo que NO entra en Sprint 4 (siguiente)
- **Sprint 5 (UI web)**: Next.js que consume estos endpoints.
- Persistencia de documentos (`DocumentRepository`) → Fase 3.
- Ingesta (Gmail/APIs) y auth → Fase 2.
- Prueba en vivo de `/tailor` contra Claude (requiere `ANTHROPIC_API_KEY`).

---

### 🚀 Sprint 4 = COMPLETAMENTE FUNCIONAL
