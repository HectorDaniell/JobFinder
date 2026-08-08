# JobFinder — Roadmap de implementación (Fase 1: Tailoring)

> Estado: **Fase 1 COMPLETADA** (sprints 0–5) · Inicio: 2026-06-22 · Cierre: 2026-07-31
> Endurecida con uso real en el **Sprint 6** (2026-08-06 a 2026-08-08), fuera del plan original.
>
> Este documento es el **plan** original. Para lo que realmente se construyó y las
> desviaciones respecto al plan, ver [PROGRESS.md](./PROGRESS.md).

---

## Visión de Fase 1

**Objetivo:** Usuario carga su perfil + pega un JD → sistema genera CV + carta adaptados en PDF/DOCX.

**Criterio de aceptación:** Dado un JD cualquiera, el sistema produce:
- ✅ CV adaptado (bullets reordenados, keywords inyectados, ATS-friendly)
- ✅ Cover letter adaptado (en ES/EN)
- ✅ PDF descargable (texto seleccionable, una columna)
- ✅ DOCX descargable
- ✅ Sin inventar datos (solo reformula bullets reales)

**Duración estimada:** 5–7 días (sprint de 4h/día = ~20–28h totales).

---

## Roadmap por sprints

### Sprint 0 — Setup inicial (1 día, ~4h)

**Objetivo:** Entorno listo, dependencias instaladas, proyecto compila.

#### Tareas

1. **Verificar Docker**
   - `docker --version` → Postgres y Redis disponibles
   - `docker compose up -d` → levanta BD y Redis sin errores
   - `docker compose logs db` → verifica health check

2. **Instalar dependencias**
   - `pnpm install` (desde raíz)
   - Verifica que resuelve todas las dependencias sin conflictos
   - Copia `.env.example` → `.env` con valores de prueba (API keys puede ser dummy por ahora)

3. **Compilar @jobfinder/core**
   - `pnpm --filter core run build`
   - Debe generar `packages/core/dist/` sin errores
   - `tsc --noEmit` en raíz → sin type errors

4. **Verificación de estructura**
   - Todas las carpetas de `apps/` y `packages/` existen
   - `pnpm ls` → muestra la estructura del workspace
   - Lint: `pnpm lint` (puede fallar en archivos no existentes, OK por ahora)

5. **Documentación**
   - Crear `docs/PROGRESS.md` (log de lo que se hizo)
   - Crear `.github/DEVELOPMENT.md` (guía para desarrolladores)

#### Deliverables
- ✅ Entorno local con Docker corriendo
- ✅ `pnpm install` sin errores
- ✅ Core compila sin errores de tipo
- ✅ Documentación de progress actualizada

#### Comandos clave
```bash
docker compose up -d                      # Levanta BD + Redis
pnpm install                              # Instala dependencias
pnpm --filter core run build              # Compila core
pnpm type-check                           # Verifica tipos en todo el monorepo
```

---

### Sprint 1 — Repositorios y acceso a datos (2 días, ~8h)

**Objetivo:** Las entidades del dominio pueden persistir y recuperarse de la BD.

#### Tareas

1. **Crear migración inicial (Drizzle)**
   - Crear `packages/db/migrations/0001_init.sql` (generada por Drizzle)
   - Ejecutar: `pnpm --filter db run migrate`
   - Verificar tablas en Postgres: `docker exec jobfinder-db psql -U jobfinder -d jobfinder -c "\dt"`

2. **Implementar `ProfileRepository`** (`packages/db/src/repositories/ProfileRepository.ts`)
   - `insert(profile: Profile): Promise<void>`
   - `findById(id: string): Promise<Profile | null>`
   - `update(profile: Profile): Promise<void>`
   - Tests unitarios con datos mock

3. **Implementar `BulletRepository`** (`packages/db/src/repositories/BulletRepository.ts`)
   - `insert(bullet: Bullet): Promise<void>`
   - `findByProfileId(profileId: string): Promise<Bullet[]>`
   - `updateMany(bullets: Bullet[]): Promise<void>`
   - Tests unitarios

4. **Implementar `JobRepository`** (`packages/db/src/repositories/JobRepository.ts`)
   - `insert(job: Job): Promise<void>`
   - `findById(id: string): Promise<Job | null>`
   - `findByDedupHash(hash: string): Promise<Job | null>` (para dedup)
   - Tests unitarios

5. **Crear factory/seeder**
   - `packages/db/scripts/seed.ts` — crea un perfil + bullets de prueba para testing manual
   - Ejecutable: `pnpm --filter db run seed`

#### Deliverables
- ✅ Migración Drizzle compila y corre
- ✅ 3 repositorios implementados (profile, bullet, job)
- ✅ Tests unitarios para cada repositorio (~60% cobertura mínimo)
- ✅ Seeder de datos de prueba
- ✅ Documentación: `packages/db/README.md` actualizado

#### Comandos clave
```bash
pnpm --filter db run migrate              # Crea tablas
pnpm --filter db run seed                 # Popula datos de prueba
pnpm --filter db run build                # Compila repositorios
pnpm --filter db run test                 # Corre tests
```

#### Criterio de aceptación
- Puedes hacer: `await profileRepo.insert(profile)` → se guarda en BD
- Puedes hacer: `await profileRepo.findById(id)` → recuperas el perfil con bullets
- Tests pasan al 100% (mock de BD)

---

### Sprint 2 — Adapter de Claude (2 días, ~8h)

**Objetivo:** El LLM adapta CV y genera cover letters con guardrails.

#### Tareas

1. **Implementar `ClaudeAdapter`** (`packages/llm/src/claude/client.ts`)
   - Wrapper de `@anthropic-ai/sdk`
   - Logging de tokens + costo estimado
   - Retry logic (exponential backoff para rate limits)
   - Env var: `ANTHROPIC_API_KEY`

2. **Implementar `tailorCv`** (`packages/llm/src/claude/tailor-cv.ts`)
   - Input: `Job`, `Profile`, `Bullet[]`, `lang`
   - Prompt: "Selecciona y reformula los bullets más relevantes de esta lista para este JD"
   - Output: `TailoredCv { bullets[], keywords[] }`
   - **Guardrail**: Zod valida que cada bullet está en el banco original (no inventa)
   - Model: **Sonnet** (balance costo/calidad)

3. **Implementar `tailorCoverLetter`** (`packages/llm/src/claude/tailor-cover.ts`)
   - Input: `Job`, `Profile`, `lang`
   - Prompt: "Escribe una cover letter profesional para este JD, mencionando skills relevantes"
   - Output: `string` (markdown o texto)
   - Model: **Sonnet**

4. **Implementar `extractJobs`** (bonus, usa **Haiku**, más barato)
   - Input: email body (raw text)
   - Output: `ExtractedJob[]` — parsea vacantes de correos desordenados
   - (Opcional para Fase 1; se usa en Fase 2)

5. **Prompts y guardrails**
   - Crear `packages/llm/src/claude/prompts/` (uno por operación)
   - Validación Zod estricta (anti-invención)
   - Tests con fixtures (JD + perfil → output validado)

#### Deliverables
- ✅ `ClaudeAdapter` implementado y testeado
- ✅ `tailorCv` produce bullets seleccionados del banco
- ✅ `tailorCoverLetter` genera texto profesional
- ✅ Guardrails Zod + tests de "no invención"
- ✅ Logging de tokens y costo
- ✅ Documentación: `packages/llm/README.md`

#### Comandos clave
```bash
pnpm --filter llm run build               # Compila adapter
pnpm --filter llm run test                # Tests (mock de API)
```

#### Criterio de aceptación
- `await llmAdapter.tailorCv(job, profile, bullets, 'en')` → retorna TailoredCv válido
- `await llmAdapter.tailorCoverLetter(job, profile, 'es')` → retorna string profesional
- Tests con mocks de Claude pasan al 100%
- Guardrails rechazan bullets no autorizados (error tipado)

---

### Sprint 3 — Generador de documentos (2 días, ~8h)

**Objetivo:** CV y cover letter en PDF y DOCX (ATS-friendly).

#### Tareas

1. **Crear plantilla ATS-friendly** (`packages/documents/src/templates/cv.html`)
   - Una columna, sin tablas/imágenes
   - Estructura estándar: Nombre, Resumen, Experiencia, Skills, Educación
   - Handlebars para variables ({{fullName}}, {{summary}}, etc.)
   - CSS limpio sin webfonts

2. **Implementar `CvGenerator`** (`packages/documents/src/generators/cv.generator.ts`)
   - Input: `TailoredCv`, `Profile`, `lang`
   - Lógica: inyecta bullets en plantilla → HTML
   - Output: HTML string (listo para render)

3. **Implementar `PdfExporter`** (`packages/documents/src/exporters/pdf.exporter.ts`)
   - Usa **Puppeteer** (headless Chrome)
   - Input: HTML → Output: Buffer (PDF)
   - Tests: genera PDF sin errores, contiene texto esperado

4. **Implementar `DocxExporter`** (`packages/documents/src/exporters/docx.exporter.ts`)
   - Usa librería **`docx`**
   - Input: structured CV data → Output: Buffer (DOCX)
   - ATS-friendly: texto seleccionable, sin imágenes

5. **Integración con DB**
   - `DocumentRepository` — guarda PDF/DOCX con versionado
   - Modelo: `{ id, jobId, type('cv'|'cover'), lang, filePath, version }`
   - Permite A/B testing futuro

#### Deliverables
- ✅ Plantilla HTML ATS-friendly
- ✅ `CvGenerator` → HTML
- ✅ `PdfExporter` → Buffer PDF
- ✅ `DocxExporter` → Buffer DOCX
- ✅ Tests end-to-end (HTML → PDF/DOCX)
- ✅ Documentación: `packages/documents/README.md`

#### Comandos clave
```bash
pnpm --filter documents run build         # Compila generadores
pnpm --filter documents run test          # Tests (genera PDFs reales)
```

#### Criterio de aceptación
- `await cvGenerator.generate(tailoredCv, profile, 'es')` → HTML con bullets inyectados
- `await pdfExporter.export(html)` → Buffer PDF válido, abre en Acrobat/navegador
- `await docxExporter.export(cvData)` → Buffer DOCX válido, abre en Word
- PDF/DOCX contienen keywords esperados (sin invención)

---

### Sprint 4 — REST API (Fase 1) (2 días, ~8h)

**Objetivo:** Endpoints HTTP para crear perfil, cargar bullets, tailor CV.

#### Tareas

1. **Scaffold NestJS** (`apps/api`)
   - `nest new api` (o setup manual)
   - `AppModule` + `ConfigModule` (env vars tipadas)
   - `HealthController` para verificar BD/Redis

2. **Módulo ProfileModule** (`apps/api/src/modules/profiles/`)
   - `ProfileController`:
     - `POST /profiles` — crea perfil (importa de Google Docs o JSON)
     - `GET /profiles/:id` — obtiene perfil con bullets
     - `PUT /profiles/:id` — actualiza perfil
   - `ProfileService` — orquesta dominio + repositorio
   - DTOs y validación Zod

3. **Módulo BulletModule** (`apps/api/src/modules/bullets/`)
   - `BulletController`:
     - `POST /profiles/:profileId/bullets` — crea bullet
     - `GET /profiles/:profileId/bullets` — lista bullets
     - `PUT /bullets/:id` — actualiza
   - DTOs y validación

4. **Módulo TailoringModule** (`apps/api/src/modules/tailoring/`)
   - `TailoringController`:
     - `POST /tailor-cv` — input: `{ jobDescription, profileId, lang }` → retorna CV + cover
     - Respuesta: `{ cv_json, cover_letter, suggested_keywords }`
   - `TailoringService` — usa `ClaudeAdapter` + `ProfileRepository`

5. **Manejo de errores global**
   - `ExceptionFilter` que mapea errores del dominio a HTTP
   - Logging estructurado (pino)

#### Deliverables
- ✅ NestJS app estructura lista
- ✅ 3 módulos (Profile, Bullet, Tailoring) con controladores y servicios
- ✅ DTOs + validación con Zod
- ✅ Logging estructurado
- ✅ Documentación: `apps/api/README.md` + comentarios en código
- ✅ Postman collection o curl examples

#### Comandos clave
```bash
pnpm --filter api run dev                 # Dev server (hot reload)
pnpm --filter api run build               # Compila
pnpm --filter api run test                # Tests e2e con Supertest
```

#### Criterio de aceptación
- `POST /profiles` con JSON → perfil creado en BD, retorna 201 + id
- `GET /profiles/:id` → retorna perfil con bullets (JSON)
- `POST /tailor-cv` con JD + profileId + lang → 200 + JSON con CV + cover
- Todos los errores muestran mensajes tipados (no 500 genéricos)

---

### Sprint 5 — UI web (Fase 1) (2 días, ~8h)

**Objetivo:** Interfaz mínima pero funcional para probar el flow end-to-end.

#### Tareas

1. **Scaffold Next.js** (`apps/web`)
   - `next new` o setup manual con App Router
   - Tailwind CSS para estilos rápidos
   - Shared types desde `@jobfinder/core`

2. **Página de bienvenida** (`app/page.tsx`)
   - Explicación breve del producto (1 párrafo)
   - Botones: "Create Profile" o "Load Sample Profile"

3. **Página de setup de perfil** (`app/setup/page.tsx`)
   - Formulario: nombre, email, resumen ES/EN, preferencias (skills, roles, etc.)
   - Opción: "Pega tu CV de Google Docs" (OAuth Google + import)
   - Submit → `POST /profiles` + guarda profileId en localStorage

4. **Página de management de bullets** (`app/profile/bullets/page.tsx`)
   - Listado de bullets actuales
   - Formulario para agregar bullet (texto ES/EN, skills, categoría)
   - Edit/delete inline
   - Submit → `POST /bullets`

5. **Página de tailoring** (`app/tailor/page.tsx`)
   - Textarea grande: "Pega el job description aquí"
   - Dropdown: selecciona idioma (ES/EN)
   - Botón: "Generar CV + carta"
   - Mientras procesa: loading spinner
   - Resultado:
     - CV adaptado (preview HTML)
     - Cover letter (texto)
     - Botones de descarga: PDF, DOCX
     - Botón "Editar" para ajustes manuales

6. **Componentes compartidos**
   - `Button`, `Card`, `Loading`, `Input` reutilizables
   - Hook `useApi` para llamadas a `/api`

7. **Manejo de estado**
   - Context o Zustand para profileId actual
   - localStorage para persistencia

#### Deliverables
- ✅ Next.js app con 4+ páginas funcionales
- ✅ Componentes reutilizables en Tailwind
- ✅ Hook `useApi` para llamadas HTTP
- ✅ Formularios con validación (Zod en cliente)
- ✅ Documentación: `apps/web/README.md`
- ✅ Componentes testeados (React Testing Library, opcional)

#### Comandos clave
```bash
pnpm --filter web run dev                 # Dev server (http://localhost:3000)
pnpm --filter web run build               # Build para producción
pnpm --filter web run test                # Tests (opcional)
```

#### Criterio de aceptación
- Accede a http://localhost:3000 → ve landing page
- Puede crear un perfil → se guarda en BD
- Puede agregar bullets → aparecen en el listado
- Puede pegar un JD y generar CV → ve preview + descarga PDF/DOCX
- Flujo completo (crear perfil → tailor → descargar) funciona sin errores

---

## Matriz de dependencias

```
Sprint 0 (Setup)
    ↓
Sprint 1 (Repositorios)
    ↓
Sprint 2 (Claude) ←→ Sprint 3 (DocGen) ← independientes, pueden ir en paralelo
    ↓        ↓
    ↓        ↓
Sprint 4 (API) ← depende de 1, 2, 3
    ↓
Sprint 5 (Web) ← depende de 4
```

Si trabajas solo, **orden lineal recomendado: 0 → 1 → 2 + 3 → 4 → 5**.

Si tuvieras ayuda, podrías **paralelizar 2 y 3** (LLM + DocGen en paralelo), ahorrando ~1 día.

---

## Criterios de aceptación por fase

### Fase 1 completa (todos los sprints):
- [x] Usuario sin cuenta crea un perfil en 2 minutos *(wizard de 3 pasos en `/setup`)*
- [x] Usuario escribe su perfil manualmente
- [ ] Usuario carga CV existente desde **Google Docs** *(RF-04: no implementado)*
- [x] Usuario pega un JD en textarea
- [x] Sistema genera CV adaptado (bullets reales, keywords del JD, ATS-friendly)
- [x] Sistema genera cover letter adaptada
- [x] Usuario descarga PDF y DOCX
- [x] PDF/DOCX no contienen datos inventados (guardrails anti-invención en `llm`)
- [ ] Tasa de error < 5% *(sin medir. El uso real destapó dos fallos —prompts
      ausentes en el `dist` y falsos positivos del anti-invención—, ambos
      corregidos en el Sprint 6, pero no se lleva un registro sistemático)*

### Métrica de éxito:
- Tiempo inicio a descarga de documentos: **< 10 segundos** (UI + API + Claude + DocGen)
  → *sin medir. Cualitativamente son decenas de segundos, no menos de 10: dominan
  las dos llamadas a Claude, que ya van en paralelo. Con el LLM falso es < 1 s.*
- Costo por tailor: **< $0.05 USD** (tokens Claude) → *sin medir. `CostLogger` ya
  calcula el coste por llamada, pero su `usageSink` no está cableado a ningún
  repositorio, así que el dato se pierde. Medirlo requiere `LlmUsageRepository`
  (la tabla `llm_usage` ya existe en el schema).*

### Desviaciones respecto al plan
- **PDF**: se usó `pdfkit` en vez de Puppeteer (ADR-0014) → sin Chromium.
- **Plantillas**: no se usó Handlebars/HTML; se introdujo un modelo intermedio
  neutral al formato (ADR-0015).
- **Tests e2e de la API**: `app.inject()` de Fastify en vez de Supertest.
- **`DocumentRepository`** (persistir los archivos generados) se difirió a la Fase 3.
- **Entidad `Experience`**: no estaba en el plan. El plan asumía que un banco de
  bullets bastaba para un CV, pero sin empresa ni fechas el documento salía como
  una lista plana de logros. Se añadió en el Sprint 6, y se generalizó a
  contenedor genérico (empleo/proyecto/educación) más adelante en el mismo
  sprint — ver ADR-0028.

### Añadido fuera del plan (Sprint 6)

El plan cubría *construir* la Fase 1; nada de esto se ve hasta que la usas contra
Claude con datos propios. Detalle en [PROGRESS.md](./PROGRESS.md) § Sesión 8:

- Entidad `Experience` + CV agrupado por empresa, proyectos y formación.
- Anti-invención recalibrado (ADR-0023) y tolerante a fallos parciales (ADR-0025).
- La estructura del CV deja de filtrarse por relevancia (ADR-0026).
- Las habilidades salen de los tags curados, no del LLM (ADR-0027).
- Skeleton de carga y botones de descarga legibles.
- Deuda del `jsonb` doblemente codificado, saldada (ADR-0024).
- `Experience` generalizada a contenedor genérico (`kind`) + cobertura
  garantizada por contenedor, resolviendo el refinamiento de producto que el
  propio Sprint 6 había dejado pendiente (ADR-0028).

---

## Notas y riesgos

| Riesgo | Mitigación |
|---|---|
| Claude API no disponible (outage) | Mock adapter para testing; graceful fallback con mensajes de error |
| Puppeteer no renderiza bien | Tests con HTML reales; verificar en navegadores comunes |
| Guardrails falsos positivos | Revisar manualmente output del LLM en cada sprint |
| Migraciones BD fallan | Backup/restore procedimientos; versionado de migraciones |

---

## Tracking y comunicación

- **Archivo de progreso**: `docs/PROGRESS.md` (actualizar diariamente)
- **Commits pequeños y descriptivos**: `feat: implement ProfileRepository` no `wip`
- **Tests siempre**: cada sprint incluye tests unitarios mínimos (50%+ cobertura)
- **Documentación en-code**: JSDoc para funciones públicas, comentarios en lógica sutil

---

## Próximas fases (Fase 2, 3, 4)

Después de Fase 1:

- **Fase 2** (Ingesta + Matching): Gmail API, normalización, embudo de filtrado
- **Fase 3** (Postulación + Tracking): envío automático, CRM, analítica
- **Fase 4** (Aprendizaje): correlación resultados↔features

Pero por ahora, **Fase 1 es el MVPartifact que valida el core del producto**.
