# JobFinder — Progreso de implementación

> Fecha de inicio: 2026-06-22 · Última actualización: 2026-08-08

## 📍 Estado actual

**Fase 1 (Tailoring) COMPLETA y en uso real con Claude.** Flujo de punta a punta:
crear perfil → historial (empleos, proyectos, educación) → banco de bullets →
pegar una oferta → descargar CV y carta en PDF/DOCX, sin datos inventados. El
**Sprint 6** endureció el producto contra los fallos que aparecieron al usarlo de
verdad, saldó la deuda del `jsonb`, y generalizó `Experience` a un contenedor con
cobertura garantizada — el refinamiento de producto que el propio Sprint 6 había
dejado pendiente.

| Sprint | Estado |
|---|---|
| 0 Setup · 1 Repos+BD · 2 Claude · 3 DocGen · 4 API · 5 Web | ✅ completos |
| **6 Uso real** — Experience, CV agrupado, guardrails, UX, `jsonb`, contenedores | ✅ completo |
| **Fase 2** — Ingesta (Gmail + APIs de bolsas) + Matching | ⬜ siguiente |
| Fase 3 — Postulación + Tracking · Fase 4 — Aprendizaje | ⬜ |

- **Tests:** 121 verdes (core 11 · llm 37 · documents 25 · api 48).
- **Deuda del `jsonb` saldada** (ADR-0024): ya se puede consultar JSON desde SQL,
  que es lo que necesita la Capa 1 del embudo.
- **Refinamiento de producto resuelto**: `Experience` es ahora un contenedor
  genérico (`kind: job | project | education`) y `TailorDocuments` garantiza que
  ningún contenedor quede sin al menos un bullet real — ver ADR-0028. Esto era
  el bloqueante que se había dejado pendiente al cerrar el Sprint 6 original.
- El detalle de cada sprint está más abajo, en orden cronológico (este archivo es
  un **log**: las secciones antiguas se conservan como historia, no como estado).

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

## Estado tras el Sprint 1 *(histórico — ver "Estado actual" arriba)*

### ✅ Lo que estaba listo entonces
- ✅ Sprint 0: Entorno, Docker, monorepo, core domain
- ✅ Sprint 1: Repositorios + BD + migraciones + seed
  - ProfileRepository, BulletRepository, JobRepository implementados
  - Schema Drizzle con todas las tables (profile, bullet, job, job_score, application, etc.)
  - Seed script con datos de prueba funcional
  - Migraciones ejecutadas, BD lista
- Docker Postgres + Redis corriendo
- Type-checking pasan 100%

### ⏳ Lo que seguía entonces *(ya completado: sprints 2 a 5)*
- **Sprint 2:** Adapter de Claude (tailorCv, tailorCoverLetter)
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

## Próxima sesión *(nota histórica del Sprint 0)*

1. `docker compose up -d` para traer la BD online
2. `pnpm install` (debería estar en cache, es rápido)
3. Continuar con **Sprint 1: Repositorios**

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

---

## 📅 SESIÓN 7 — Sprint 5: UI web (Next.js) · cierre de la Fase 1

**Fecha:** 2026-07-31

### ✅ Sprint 5 — COMPLETADO

**Objetivo:** poner cara a la API para completar el flujo de la Fase 1: crear
perfil → cargar bullets → pegar una oferta → descargar CV y carta.

#### ✅ 1. Fundaciones e identidad visual ("Señal")
- Tailwind + PostCSS cableados; **design tokens** como variables CSS en canal RGB
  (permiten `bg-accent/10`), con tema **claro y oscuro** desde el inicio. ADR-0021.
- Inter + JetBrains Mono vía `next/font` (self-hosted). Header flotante con blur
  y script anti-parpadeo (FOUC).
- **CORS** habilitado en la API (único cambio de backend del paso).
- Se retiraron `axios` y `swr` del scaffold; se añadió `lucide-react`.

#### ✅ 2. Cliente de API tipado
- `lib/types.ts`: **DTOs de cable** (el JSON real: sin métodos, fechas como
  string), reutilizando los tipos puros de `core`.
- `lib/api.ts`: un único envoltorio de `fetch` que maneja los tres gotchas
  (4xx/5xx no lanzan, 204 sin body, red caída) y los convierte en `ApiError`
  —espejo cliente de `DomainError`—.

#### ✅ 3. Estado y navegación
- `ProfileProvider` (Context + `localStorage`) con hook `useProfile()` y flag
  `ready`; guardas de navegación por pantalla. Sin Redux. ADR-0019, ADR-0020.

#### ✅ 4-6. Las cinco pantallas
- **`/setup`**: wizard de 3 pasos. La API es la autoridad: su `ApiError.field`
  hace saltar al paso correcto y marca el input exacto.
- **`/profile`**: ver perfil y editar preferencias (lo único que el PATCH permite).
- **`/bullets`**: CRUD completo con edición inline y borrado en dos clics.
- **`/tailor`** (la estrella): pegar oferta → generar → preview en tabs →
  **descarga desde base64** (`atob` → `Uint8Array` → `Blob` → `<a download>`).
- Primitivas de formulario controladas reutilizadas en las tres pantallas.

#### ✅ 7. Verificación end-to-end
- Recorrido completo como usuario nuevo, con archivos reales (`%PDF`, `PK\x03\x04`).
- **Bug encontrado y corregido**: el header ocultaba los enlaces por debajo de
  `sm`, dejando la app **sin navegación en móvil**. Ninguna prueba unitaria lo
  habría detectado.
- Aviso en el resultado: los documentos no se guardan (persistirlos es Fase 3).

#### ✅ 8. Documentación
- ADRs **0019–0022**; `apps/web/README.md`; este PROGRESS; README raíz actualizado.

### Desarrollo sin créditos de Anthropic
`USE_FAKE_LLM=true` sustituye **solo** la llamada a Claude; el resto del pipeline
(perfil, bullets, generación de PDF/DOCX) sigue siendo real. Activar Claude =
poner la key y el flag en `false`, sin tocar código. ADR-0022.

### Tests
Sin cambios: **89 verdes** (core 3 · llm 32 · documents 20 · api 34). La web se
verificó con recorridos reales en navegador, no con tests automatizados (deuda
consciente: ver abajo).

### Criterio de aceptación de la Fase 1 ✅
- Crear perfil desde la UI → se guarda en Postgres ✅
- Añadir bullets → aparecen en el listado ✅
- Pegar un JD → CV y carta adaptados, con preview y descarga en PDF y DOCX ✅
- Sin datos inventados: el contenido sale de bullets reales ✅

### ⏳ Deuda conocida y siguientes pasos
- **`jsonb` double-encoded** en `packages/db`: las columnas JSON se guardan como
  string, así que SQL no puede consultar dentro. Conviene arreglarlo **antes de
  la Fase 2** (la Capa 1 del embudo lo necesitará).
- Sin tests automatizados de la web (React Testing Library / Playwright).
- RF-04 (importar CV desde Google Docs) sigue pendiente de la Fase 1.
- Persistir los documentos generados (`DocumentRepository`) → Fase 3.
- Verificar `/tailor` contra Claude real cuando haya API key.

---

### 🚀 Sprint 5 = COMPLETAMENTE FUNCIONAL · **FASE 1 CERRADA**

---

## 📅 SESIÓN 8 — Sprint 6: el producto contra la realidad

**Fecha:** 2026-08-05 / 2026-08-06

### ✅ Sprint 6 — COMPLETADO

**Objetivo:** con la `ANTHROPIC_API_KEY` puesta y el perfil real cargado, la Fase 1
dejó de ser una demo. Este sprint es lo que el uso real destapó: dos bugs de
producción, un CV que no tenía forma de CV, y la deuda del `jsonb`.

#### ✅ 1. Primer uso real: dos bugs de producción

- **Prompts ausentes en `dist`** — `tsc` no copia archivos que no son `.ts`, así
  que `tailor-cover.txt` no llegaba al build y el error salía como un `ENOENT`
  crudo. Se añadió `scripts/copy-prompts.js` (solo built-ins de Node, falla ruidoso
  si copia cero archivos) y un `PromptFileNotFoundError` tipado. Cierra ADR-0012.
- **Anti-invención con falsos positivos** — Jaccard es simétrico y penaliza la
  diferencia de longitud y vocabulario que produce *toda* reformulación legítima,
  que es justo lo que el prompt le pide a Claude. Medido con bullets reales: las
  reformulaciones caían al 40–50% contra un umbral del 50%. Se cambió al
  **coeficiente de contención** (`|A∩B| / min(|A|,|B|)`): las mismas
  reformulaciones suben al 63–85% y una invención sigue en 0%. **ADR-0023**.

#### ✅ 2. Entidad `Experience` (el CV tenía logros, pero no historial)

- `Experience` en core + tabla + migración `0001` + `ExperienceRepository`.
- CRUD completo en la API (`/profiles/:id/experiences`) y pantalla `/experiences`.
- Los bullets se enlazan a un empleo; `sourceRole` queda solo para lo que no
  pertenece a ninguno (tesis, proyectos personales).
- "Sigo trabajando aquí" **no** es un booleano aparte: es la ausencia de
  `endDate`, para que el estado imposible (actual *y* con fecha de fin) no se
  pueda representar.
- Fix de zona horaria: las fechas se leen con los getters **UTC**; los locales
  mostraban abril como marzo en UTC-5.

#### ✅ 3. El CV agrupado (Paso 1d)

Antes el CV era una lista plana de bullets: no decía dónde ni cuándo ocurrió nada.

- `TailoredCv.bullets` pasa de `string[]` a `TailoredBullet[]`: todo salvo el
  texto (`category`, `experienceId`, `sourceRole`, `skills`) viene del bullet
  **real** emparejado, nunca del LLM.
- El guardrail anti-invención ya comparaba cada reformulación contra todo el
  banco; ahora **conserva el mejor match** en vez de tirarlo. Una pasada, dos
  respuestas: el veredicto y el origen.
- `documents` agrupa en bloques con encabezado: experiencia por empresa
  (actual primero, con periodo), y proyectos y formación por su contexto. Las
  tres secciones comparten el tipo `ResumeGroup`, así que ambos exporters las
  dibujan con la misma función.

#### ✅ 4. El producto contra un CV real (4 correcciones)

Revisando un PDF generado de verdad:

- **Empleos que desaparecían** — omitir una empresa sin bullets seleccionados
  abría un hueco de 5 meses en el historial. Ahora entran todas. **ADR-0026**.
- **Formación que desaparecía** — un título es un hecho, no un argumento que
  compita por relevancia. El caso de uso lo añade siempre. **ADR-0026**.
- **Habilidades como frases** ("arquitectura frontend", "buenas prácticas") en vez
  de tecnologías. Ahora salen de los tags que el usuario ya curó, ordenadas por
  relevancia para la oferta. **ADR-0027**.
- **Un bullet inventado tumbaba todo** — ahora se descarta solo ese y el CV sigue;
  solo falla si no sobrevive ninguno. Y el prompt (v1.1) dice explícitamente que
  dejar un requisito sin cubrir es el resultado correcto. **ADR-0025**.

#### ✅ 5. UX de la pantalla estrella

- **Skeleton** con la forma real del resultado mientras Claude responde, más una
  barra **indeterminada**: las dos llamadas van en paralelo dentro de un solo
  POST, así que cualquier porcentaje sería inventado.
- **Botones de descarga** que dicen qué documento son ("CV", "Carta") con color e
  icono por formato, en vez de un nombre de archivo que había que leer entero. El
  `kind` viene de la API, no se adivina parseando el filename.
- **Fix del `<select>` en modo oscuro**: `color-scheme` no bastaba porque `.input`
  le da fondo propio al control, y Chrome pintaba las opciones sobre blanco.

#### ✅ 6. Deuda saldada: el `jsonb` doblemente codificado

La `jsonb` de Drizzle hacía `JSON.stringify` antes de pasar el valor a
`postgres.js`, que ya serializa por su cuenta. Postgres guardaba una **cadena**
que contiene JSON, así que `preferences->>'modality'` devolvía NULL y ningún
índice GIN servía — inutilizando la Capa 1 del embudo antes de escribirla.

Se corrigió con un `customType` propio (`packages/db/src/columns.ts`), la
migración idempotente `0002` que repara las filas existentes, y una regla de
ESLint que impide reintroducir el import malo. **ADR-0024**.

### Tests

**104 verdes** (core 10 · llm 36 · documents 24 · api 34), desde los 89 del
Sprint 5. Los nuevos cubren la agrupación por empresa y por contexto, el empleo
sin bullets, la educación añadida y no duplicada, las skills curadas y su orden,
y la degradación con gracia del guardrail.

### Verificación

Con datos reales y sin gastar llamadas de más: el pipeline se ejercitó contra
Postgres con un LLM de doble que devolvía la misma selección que había hecho
Claude, comprobando el PDF resultante. Los arreglos de UI se verificaron en el
navegador (estilos computados en ambos temas, no capturas), y el `jsonb` con los
tres caminos reales contra la API viva: lectura, `PATCH` e `INSERT`.

### ⏳ Lo que NO entra en el Sprint 6

- **Refinamiento del flujo de inputs**: una `Experience` con descripción propia.
  Se decidió esperar a tener más uso real antes de rediseñar (ver ADR-0026).
- RF-04 (importar CV desde Google Docs) sigue pendiente.
- Sin tests automatizados de la web.
- pgvector, embeddings y `packages/sources` siguen vacíos → Fase 2.

---

### 🚀 Sprint 6 = COMPLETAMENTE FUNCIONAL

---

## 📅 SESIÓN 9 — Sprint 6 (cont.): `Experience` como contenedor genérico

**Fecha:** 2026-08-08

### ✅ COMPLETADO

**Objetivo:** el Sprint 6 había dejado pendiente el refinamiento de producto que
esta sesión resuelve — probar el flujo contra Claude con datos reales mostró
empleos con encabezado y fechas pero **sin ninguna línea debajo** (el LLM no
seleccionó ningún bullet suyo para esa vacante). La corrección obvia,
`Experience.description` como texto estático, plantea una pregunta que no tiene
buena respuesta: si el hueco se tapa con texto fijo, ¿para qué sirven los
bullets? Y si los bullets siguen siendo lo único que se adapta, ¿en qué se
diferencia esto de un perfil de LinkedIn? Antes de seguir a la Fase 2 había que
resolver esa pregunta de fondo, no solo el síntoma.

#### ✅ 1. Diagnóstico: no faltaba un campo, faltaba una regla

El problema no era el modelo de datos — era que se le pedía al LLM "elige los
bullets más relevantes", y esa pregunta no es la misma que "arma el mejor CV
posible". Un CV real nunca deja un puesto en blanco. Esa es una regla de
**composición** que faltaba en el sistema, no un dato que faltara en el modelo.

Persiguiendo ese diagnóstico salió a la luz un segundo problema, estructural:
proyectos y educación no eran contenedores reales, sino bullets sueltos
agrupados por `sourceRole` (texto libre) — por eso el proyecto personal salía
titulado como una concatenación de palabras en vez de tener nombre y fecha
propios, como cualquier entrada real de un CV.

#### ✅ 2. `Experience` se generaliza a contenedor con `kind`

- `kind: 'job' | 'project' | 'education'`, inmutable tras crear. `organization`
  y `title` se **reinterpretan** por tipo (empresa/rol, contexto/proyecto,
  institución/título) en vez de sumar columnas específicas por tipo.
- `Bullet.experienceId` pasa a ser **obligatorio** — ya no existe el bullet
  suelto. `sourceRole` desaparece: era el apaño que este cambio hace innecesario.
- `BulletCategory` baja de 4 a 2 valores (`experience` | `achievement`): una
  distinción editorial, independiente de DÓNDE vive el bullet (eso lo responde
  `kind` ahora).
- Migración `0003_experience_as_container.sql` (9 pasos, idempotente): agrupa
  los bullets huérfanos existentes por su `sourceRole` en contenedores nuevos.
  `Bullet.experienceId NOT NULL` obliga a que el borrado de un contenedor
  **cascadee** a sus bullets (antes quedaban huérfanos con `SET NULL`) — único
  comportamiento consistente con "todo bullet pertenece a un contenedor".

#### ✅ 3. Cobertura garantizada — el LLM propone, el sistema verifica

- `TailorDocuments.withEducation` se generaliza a `withGuaranteedCoverage`:
  cubre empleos, proyectos y educación con el mismo mecanismo que antes solo
  protegía a la formación (ADR-0026). Por cada contenedor que quede sin ningún
  bullet seleccionado, se añade determinísticamente el mejor bullet real del
  banco por solapamiento de skills — nunca por el LLM, así que la garantía de
  cero invención no se toca y no se gasta ninguna llamada adicional.
- Prompt (`tailor-cv.txt` v1.2): agrupa el banco por contenedor (`[Group N]`) y
  pide explícitamente que la selección represente TODA la trayectoria, para que
  el sistema necesite recurrir a la cobertura garantizada lo menos posible.
- **ADR-0028** documenta la decisión completa, incluida la respuesta directa a
  "¿en qué se diferencia esto de LinkedIn?": el banco es un superconjunto
  deliberado — más evidencia de la que cabe en un CV — y dos vacantes distintas
  producen dos CV distintos del mismo material.

#### ✅ 4. Las cinco capas actualizadas

`core` (entidades + caso de uso) → `db` (schema + migración + repos + seed) →
`llm` (prompt + agrupación + adapter) → `documents` (modelo simplificado, ya no
necesita distinguir bullets "sin contexto") → `api` (schemas/DTOs/controllers) →
`web` (formularios con selector de `kind`, pantalla `/experiences` con tres
secciones, nav "Historial").

### Tests

**121 verdes** (core 11 · llm 37 · documents 25 · api 48), desde los 104 del
Sprint 6. Se cerró además una brecha de cobertura preexistente:
`experiences.controller.ts` no tenía tests unitarios propios — ahora tiene 12.
De paso se corrigieron fixtures rotos que el gap de tipos en `tests/` (no
cubierto por `tsc`, ver STRUCTURE.md) dejaba pasar en silencio: un filtro sobre
`sourceRole` que siempre evaluaba a `undefined`, y un e2e con la forma vieja de
`TailoredCv.bullets`.

### Verificación

Contra la base de datos real: los 6 contenedores y 17 bullets existentes
migraron correctamente. Se ejercitó el caso adverso a propósito — un LLM
simulado que solo cubrió 1 de 6 contenedores — y el CV final terminó con los 6
contenedores con contenido, cero huecos. Verificación visual en el navegador de
`/experiences` (tres secciones), `/bullets` (selector agrupado por tipo) y los
formularios cambiando de campos según `kind`, sin errores de consola.

### ⏳ Lo que NO entra en esta sesión

- **Datos placeholder**: los contenedores de proyecto/educación que la
  migración creó automáticamente a partir de bullets huérfanos tienen título y
  fecha aproximados (el texto de `sourceRole` y el `created_at` más antiguo del
  grupo) — necesitan edición manual del usuario vía `/experiences`. Es un
  placeholder explícito, no un dato inventado por el sistema (ver ADR-0028).
- RF-04 (importar CV desde Google Docs) sigue pendiente.
- Sin tests automatizados de la web.
- pgvector, embeddings y `packages/sources` siguen vacíos → Fase 2, ahora sin
  bloqueantes de producto pendientes.

---

### 🚀 Sesión 9 = COMPLETAMENTE FUNCIONAL · **Fase 2 desbloqueada**
