# JobFinder — Guía de Handover y Reanudación de Contexto para IA

> **Propósito de este documento:** Este archivo permite a una IA (o desarrollador) retomar el desarrollo de **JobFinder** desde cero tras un formateo del equipo o clonación en un nuevo entorno, sin perder contexto, respetando todas las decisiones de arquitectura, evitando trampas conocidas y siguiendo la metodología estricta del proyecto.

---

## 1. ¿Qué es JobFinder y cuál es su filosofía?

JobFinder es un **copiloto personal de búsqueda de empleo de alta señal** (local-first, enfocado en desarrolladores).

### Principios Fundamentales:
1. **Cero invención de datos (Anti-alucinaciones):** El LLM jamás inventa bullets, métricas, empresas ni tecnologías. Solo selecciona y reformula evidencia real proveniente de un banco de bullets del usuario. La verificación anti-invención se realiza de forma determinista mediante contención de subcadenas normalizadas ([ADR-0023](file:///d:/Projects/JobFinder/docs/adr/0023-contencion-en-vez-de-jaccard-anti-invencion.md)).
2. **Filtrar barato, enriquecer solo lo que sobrevive (Embudo en Capas - [ADR-0029](file:///d:/Projects/JobFinder/docs/adr/0029-ingesta-en-dos-tiempos-descubrir-y-enriquecer.md)):**
   - **Descubrir ≠ Enriquecer:** Los correos de alerta (LinkedIn, Glassdoor) son *notificaciones*; **no traen la descripción del puesto**. Producen vacantes *delgadas* (`description: undefined`).
   - El enriquecimiento (buscar el JD completo) **va dentro del embudo, DESPUÉS de la Capa 1 de reglas**. Descartar cientos de vacantes por ubicación/seniority con coste \$0 antes de gastar ancho de banda o tokens en enriquecerlas.
3. **Cero scraping de plataformas con login:** Prohibido hacer scraping de LinkedIn, Glassdoor o Indeed (PRD D2). Cero uso de APIs que revenden scraping empaquetado. Canales oficiales, APIs públicas de ATS (Greenhouse, Lever, Ashby) o captura asistida por el usuario.

---

## 2. Estado Actual del Proyecto (Dónde estamos exactamente)

- **Rama Git:** `develop`.
- **Fase 1 (Sprints 0 al 6) — 100% COMPLETADA Y EN USO REAL:**
  - Setup monorepo pnpm, Docker (Postgres 16 + pgvector, Redis), Drizzle ORM (5 migraciones aplicadas).
  - Entidad `Experience` como contenedor genérico de 3 tipos: `job | project | education` ([ADR-0028](file:///d:/Projects/JobFinder/docs/adr/0028-experience-como-contenedor-y-cobertura-garantizada.md)).
  - Banco de bullets asociados obligatoriamente a contenedores con garantía de cobertura determinista en CV.
  - Adaptador de Claude (Haiku / Sonnet) con guardrails de no-invención y cálculo de costos.
  - Generación de documentos ATS descargables en PDF (PDFKit) y DOCX (docx).
  - API REST en NestJS + Fastify con validación Zod y filtros de excepciones de dominio.
  - Frontend en Next.js 14 (App Router) con gestión de perfil, historial, banco de bullets y pantalla de tailoring.

- **Fase 2 / Sprint 7 (Descubrimiento e Ingesta de Vacantes Delgadas) — 100% COMPLETADO:**
  - **Paso 1.1 (`LinkedInJobParser`):** Parser determinista sobre HTML de alertas de LinkedIn + fixture sanitizado ([`linkedin-job-alert.html`](file:///d:/Projects/JobFinder/packages/sources/tests/fixtures/emails/linkedin-job-alert.html)).
  - **Paso 1.2 (`GlassdoorJobParser`):** Parser determinista sobre HTML de alertas de Glassdoor + fixture sanitizado ([`glassdoor-job-alert.html`](file:///d:/Projects/JobFinder/packages/sources/tests/fixtures/emails/glassdoor-job-alert.html)).
  - **Paso 2 (`GmailSource`):** Adaptador de lectura de Gmail implementando `EmailReaderPort` (OAuth2 offline con refresh token, decodificador recursivo MIME base64url, alcance estricto de solo lectura `gmail.readonly`). Incluye CLI helper [`google-auth.js`](file:///d:/Projects/JobFinder/packages/sources/scripts/google-auth.js).
  - **Paso 3 (`IngestJobs` & `EmailAlertSource`):** Caso de uso central en `@jobfinder/core` con interfaz desacoplada `JobStore` (satisfecha estructuralmente por `JobRepository`), orquestando deduplicación por hash determinista (`Job.generateDedupHash`) y persistiendo vacantes delgadas.
  - **Paso 4 (`JobsModule` en API):** Módulo NestJS con `JobsController` (`POST /jobs/ingest/email`, `GET /jobs`, `GET /jobs/:id`), esquemas Zod y cableado de dependencias en `InfraModule`.

- **Métricas de Calidad Verificadas:**
  - **177 tests pasando en verde** (Core 21, Sources 38, LLM 37, Documents 25, API 56).
  - **`pnpm type-check`:** 0 errores en todos los paquetes y apps del monorepo.

---

## 3. Próximos Pasos (Qué sigue: Fase 2 / Sprint 8)

El siguiente paso es la **Cascada de Enriquecimiento** ([ADR-0029 §4](file:///d:/Projects/JobFinder/docs/adr/0029-ingesta-en-dos-tiempos-descubrir-y-enriquecer.md)):

```
Vacante Delgada (LinkedIn/Glassdoor) que superó Capa 1 de Reglas
   ↓
1. ¿Ya venía completa? (Bolsas con API) → Listo.
2. ATS pública de la empresa (Greenhouse, Lever, Ashby) → API JSON pública sin auth.
3. Carrera en web corporativa (JSON-LD application/ld+json JobPosting).
4. Captura asistida (POST /capture vía bookmarklet iniciado por el usuario).
```

### Plan Inmediato para Sprint 8:
1. **Paso 1 — `GreenhouseEnricher`:** Implementar en `@jobfinder/sources` consumiendo `JobEnricherPort`. Extraer vacantes usando la API pública de Greenhouse (`https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{id}`).
2. **Paso 2 — `LeverEnricher`:** Implementar en `@jobfinder/sources` consumiendo `JobEnricherPort` vía API pública de Lever (`https://api.lever.co/v0/postings/{company}/{id}`).
3. **Paso 3 — `AshbyEnricher`:** Implementar en `@jobfinder/sources` consumiendo `JobEnricherPort` vía API pública de Ashby (`https://api.ashbyhq.com/posting-api/job-board/{board_token}`).
4. **Paso 4 — Extractor JSON-LD:** Parser de metadatos `JobPosting` desde páginas corporativas.
5. **Paso 5 — Endpoint de Captura (`POST /capture`):** Endpoint seguro en la API local para inyectar descripciones capturadas manualmente por el usuario.

---

## 4. Mapa de Documentación Imprescindible (Orden de Lectura)

Antes de tocar código, cualquier IA debe leer:

1. [`docs/PRD.md`](file:///d:/Projects/JobFinder/docs/PRD.md): Objetivos de producto, decisiones D1 a D5, requisitos no funcionales (RNF-01 a RNF-08).
2. [`docs/adr/0029-ingesta-en-dos-tiempos-descubrir-y-enriquecer.md`](file:///d:/Projects/JobFinder/docs/adr/0029-ingesta-en-dos-tiempos-descubrir-y-enriquecer.md): **DOCUMENTO CAPITAL DE LA FASE 2.** Explica por qué el diseño original de junio se rediseñó en agosto de 2026.
3. [`docs/ARQUITECTURA.md`](file:///d:/Projects/JobFinder/docs/ARQUITECTURA.md): Estructura hexagonal, puertos, adapters, esquema de base de datos.
4. [`docs/FLUJO.md`](file:///d:/Projects/JobFinder/docs/FLUJO.md): Diagrama visual del flujo de punta a punta (Tailoring e Ingesta).
5. [`docs/adr/0028-experience-como-contenedor-y-cobertura-garantizada.md`](file:///d:/Projects/JobFinder/docs/adr/0028-experience-como-contenedor-y-cobertura-garantizada.md): Contenedores de trayectoria y selección determinista de bullets.
6. [`docs/adr/0023-contencion-en-vez-de-jaccard-anti-invencion.md`](file:///d:/Projects/JobFinder/docs/adr/0023-contencion-en-vez-de-jaccard-anti-invencion.md): Algoritmo de contención estricta contra alucinaciones.
7. [`docs/PROGRESS.md`](file:///d:/Projects/JobFinder/docs/PROGRESS.md): Log histórico cronológico con decisiones y deudas técnicas asumidas.

---

## 5. Mapa de Código Fuente Clave

| Capa / Módulo | Archivos Principales | Responsabilidad |
|---|---|---|
| **Dominio (`packages/core`)** | [`domain/entities/Job.ts`](file:///d:/Projects/JobFinder/packages/core/src/domain/entities/Job.ts)<br>[`domain/entities/Experience.ts`](file:///d:/Projects/JobFinder/packages/core/src/domain/entities/Experience.ts)<br>[`domain/entities/Bullet.ts`](file:///d:/Projects/JobFinder/packages/core/src/domain/entities/Bullet.ts) | Entidades puras de dominio. `Job` calcula su `enrichmentStatus` (`thin | enriched | unavailable`) de forma derivada. |
| **Puertos (`packages/core`)** | [`ports/JobSourcePort.ts`](file:///d:/Projects/JobFinder/packages/core/src/ports/JobSourcePort.ts)<br>[`ports/JobEnricherPort.ts`](file:///d:/Projects/JobFinder/packages/core/src/ports/JobEnricherPort.ts)<br>[`ports/EmailReaderPort.ts`](file:///d:/Projects/JobFinder/packages/core/src/ports/EmailReaderPort.ts) | Contratos puros. `JobEnricherPort` devuelve `null` si no le corresponde la vacante. |
| **Casos de Uso (`packages/core`)** | [`use-cases/IngestJobs.ts`](file:///d:/Projects/JobFinder/packages/core/src/use-cases/IngestJobs.ts)<br>[`use-cases/TailorDocuments.ts`](file:///d:/Projects/JobFinder/packages/core/src/use-cases/TailorDocuments.ts) | Orquestación pura. `IngestJobs` define la interfaz `JobStore` que satisface el repositorio. |
| **Fuentes (`packages/sources`)** | [`email/parsers/LinkedInJobParser.ts`](file:///d:/Projects/JobFinder/packages/sources/src/email/parsers/LinkedInJobParser.ts)<br>[`email/parsers/GlassdoorJobParser.ts`](file:///d:/Projects/JobFinder/packages/sources/src/email/parsers/GlassdoorJobParser.ts)<br>[`email/registry.ts`](file:///d:/Projects/JobFinder/packages/sources/src/email/registry.ts)<br>[`email/GmailSource.ts`](file:///d:/Projects/JobFinder/packages/sources/src/email/GmailSource.ts)<br>[`email/EmailAlertSource.ts`](file:///d:/Projects/JobFinder/packages/sources/src/email/EmailAlertSource.ts) | Extracción de datos crudos. Funciones puras sobre HTML, desacopladas de APIs externas en tests. |
| **Persistencia (`packages/db`)** | [`schema/jobs.ts`](file:///d:/Projects/JobFinder/packages/db/src/schema/jobs.ts)<br>[`repositories/JobRepository.ts`](file:///d:/Projects/JobFinder/packages/db/src/repositories/JobRepository.ts) | Drizzle ORM sobre PostgreSQL. Migración `0004_thin_jobs` soporta vacantes delgadas. |
| **API (`apps/api`)** | [`src/infra/infra.module.ts`](file:///d:/Projects/JobFinder/apps/api/src/infra/infra.module.ts)<br>[`src/jobs/jobs.controller.ts`](file:///d:/Projects/JobFinder/apps/api/src/jobs/jobs.controller.ts)<br>[`src/tailor/tailor.controller.ts`](file:///d:/Projects/JobFinder/apps/api/src/tailor/tailor.controller.ts) | NestJS Fastify. Inyección de dependencias mediante factory providers en `InfraModule`. |

---

## 6. Trampas, Gotchas y Reglas No Negociables (¡NO VIOLAR!)

### ⚠️ Trampa 1: El Límite Hexagonal de `@jobfinder/core`
- **Regla:** `packages/core` **NUNCA** debe importar de `@jobfinder/db`, `@jobfinder/sources`, `@jobfinder/llm` ni de ninguna dependencia externa pesada.
- **Solución:** Definir interfaces en el consumidor (Consumer-Driven Interfaces), por ejemplo `JobStore` en [`IngestJobs.ts`](file:///d:/Projects/JobFinder/packages/core/src/use-cases/IngestJobs.ts). `JobRepository` de `db` la implementa estructuralmente sin acoplar el core.

### ⚠️ Trampa 2: Las Vacantes Delgadas (`thin`) NO son un Error
- **Regla:** Un `Job` sin descripción es el estado natural de descubrimiento de alertas de correo.
- **Gotcha:** Nunca rechaces ni lances error porque `description` sea `undefined` en la etapa de ingesta. Solo `TailorDocuments` exige descripción antes de invocar a Claude.

### ⚠️ Trampa 3: Los Tres Estados del Registro de Correos (`registry.ts`)
- **Regla:** `parseJobAlert` retorna tres estados:
  1. `status: 'parsed'` $\rightarrow$ Funcionó, extrajo vacantes.
  2. `status: 'empty'` $\rightarrow$ Remitente **conocido** pero extrajo 0 vacantes. **Significa que la plantilla HTML cambió**. Nunca colapsar a array vacío; esto cumple **RNF-07** avisando rotura de plantilla.
  3. `status: 'unknown-sender'` $\rightarrow$ Remitente desconocido (candidato a fallback de LLM).

### ⚠️ Trampa 4: Puertos Locales de Docker
- **Postgres:** Puerto host `5433` (mapeado a 5432 del contenedor). **NO** usar 5432 para evitar conflictos con bases de datos del trabajo del usuario.
- **Redis:** Puerto host `6379`.
- **Comando:** `docker compose up -d` (usa `docker-compose.yml` en la raíz).

### ⚠️ Trampa 5: `DATABASE_URL` y Tests Unitarios en la API
- **Gotcha:** `@jobfinder/db` carga un singleton `db` que lanza un error al importar si `process.env.DATABASE_URL` no existe.
- **Solución:** [`apps/api/tests/setup.ts`](file:///d:/Projects/JobFinder/apps/api/tests/setup.ts) asigna un valor ficticio (`process.env.DATABASE_URL ??= 'postgres://...'`). Como `postgres-js` es lazy y los tests mockean los repositorios, nunca se abre conexión real durante los tests.

### ⚠️ Trampa 6: Configuración TypeScript y Emisión de Archivos
- **Gotcha:** En monorepos TS, ejecutar `tsc` en la app puede contaminar carpetas `src/` o `tests/` con `.js` y `.js.map` sueltos.
- **Solución:** `apps/api/tsconfig.json` tiene `"noEmit": true`. Solo `tsconfig.build.json` emite hacia `dist/`.

### ⚠️ Trampa 7: Ejecución de Tests en Vitest
- **Gotcha:** `pnpm test` en la raíz arranca Vitest en modo **watch interactivo** y bloquea la consola.
- **Solución:** Para ejecuciones de una sola pasada:
  - En packages: `pnpm vitest run packages/`
  - En la API: `pnpm --filter api test` (ejecuta `vitest run`)

### ⚠️ Trampa 8: Prohibido Commitear o Pushear sin Orden Explícita
- **Directriz Absoluta del Usuario:** NUNCA ejecutar `git commit` ni `git push` de mutuo propio. Esperar a que el usuario diga explícitamente que se comitee.
- **Estándar de Commits (Skill `estandar-commits`):**
  - Todo el mensaje en inglés (asunto y cuerpo).
  - Formato: `type(scope): summary in imperative mood` (máx 72 caracteres, sin punto).
  - Cuerpo: **Solo viñetas `- ` en imperativo**, una sola línea por viñeta, nombrando archivos y símbolos concretos. Cero párrafos de prosa, cero explicaciones de por qué, cero informes de tests.
  - Validación previa obligatoria:
    `node C:\Users\hecto\.gemini\config\skills\estandar-commits\scripts\validar-commit.mjs <archivo-del-mensaje>`
  - Commitear siempre con archivo UTF-8: `git commit -F <archivo>`.

### ⚠️ Trampa 9: Metodología Paso a Paso con el Usuario
1. Antes de modificar código, **explicar qué se va a hacer**, qué archivos se crearán o modificarán, y si hay impacto en BD.
2. Si un paso tiene alternativas arquitectónicas o requiere credenciales/decisiones del usuario, **detenerse y presentar opciones con recomendaciones**.
3. Tras ejecutar, correr pruebas (`vitest` y `pnpm type-check`), resumir cambios y **mostrar siempre la tabla de estado del roadmap**.

---

## 7. Guía de Restauración en una Máquina Limpia (Post-Formateo)

Tras formatear el PC e instalar Node.js >= 22, pnpm, Docker Desktop y Git:

```powershell
# 1. Clonar el repositorio y entrar
git clone <URL_DEL_REPOSITORIO> JobFinder
cd JobFinder
git checkout develop

# 2. Levantar base de datos y Redis
docker compose up -d

# 3. Instalar dependencias
pnpm install

# 4. Configurar variables de entorno
cp .env.example .env
# Asegurar que en .env DATABASE_URL apunta al puerto 5433:
# DATABASE_URL=postgres://jobfinder:jobfinder_dev_password@localhost:5433/jobfinder

# 5. Aplicar migraciones a Postgres
pnpm --filter db run migrate

# 6. Compilar todos los packages internos del monorepo
pnpm run build:packages

# 7. Verificar salud completa del repositorio
pnpm vitest run packages/        # Deben pasar 121 tests
pnpm --filter api test           # Deben pasar 56 tests
pnpm type-check                  # 0 errores en packages y apps

# 8. Reinstalar la skill global de commits en ~/.gemini (si se usa Antigravity)
# Copiar el archivo SKILL.md y el script validar-commit.mjs a:
# C:\Users\<usuario>\.gemini\config\skills\estandar-commits\
```

Con estos 8 pasos, el entorno queda exactamente idéntico y listo para comenzar el **Sprint 8**.
