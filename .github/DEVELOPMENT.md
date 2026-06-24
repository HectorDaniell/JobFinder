# Guía de desarrollo — JobFinder

> Para desarrolladores (principalmente el creador, actualmente solo usuario)

---

## Quick start (cada sesión)

```bash
# 1. Levanta infraestructura
docker compose up -d

# 2. Instala/actualiza dependencias
pnpm install

# 3. Verifica que todo compila
pnpm type-check
pnpm --filter core run build

# 4. (Opcional) Abre la BD en interfaz gráfica
# DBeaver o TablePlus: host=localhost, puerto=5433, user=jobfinder, pwd=localdev
```

---

## Estructura del proyecto

```
jobfinder/
├── docs/
│   ├── PRD.md              ← Requisitos de producto
│   ├── ARQUITECTURA.md     ← Diseño técnico
│   ├── SETUP.md            ← Instrucciones de instalación
│   ├── ROADMAP.md          ← Plan de 5 sprints
│   └── PROGRESS.md         ← Log de progreso (este archivo)
├── apps/
│   ├── api/                ← REST backend (NestJS + Fastify)
│   ├── worker/             ← Job processor (BullMQ)
│   └── web/                ← Frontend (Next.js)
├── packages/
│   ├── core/               ← Domain logic (puro, sin deps)
│   ├── db/                 ← Database (Drizzle ORM)
│   ├── shared/             ← Tipos compartidos
│   ├── sources/            ← Job source adapters
│   ├── llm/                ← Claude + embeddings
│   └── documents/          ← CV/cover generation
└── docker-compose.yml      ← Infraestructura (Postgres + Redis)
```

---

## Flujo de trabajo (por sprint)

### Sprint 0: Setup ✅ COMPLETO
- Infraestructura Docker
- Dependencias
- TypeScript compilando

### Sprint 1: Repositorios (PRÓXIMO)
1. Lee [ROADMAP.md](docs/ROADMAP.md) sección Sprint 1
2. Crea `packages/db/src/repositories/ProfileRepository.ts`
3. Implementa métodos: `insert`, `findById`, `update`
4. Escribe tests unitarios
5. Crea seeder de datos de prueba
6. Marca tareas completadas en [PROGRESS.md](docs/PROGRESS.md)

### Patrón para todos los sprints
1. **Leer requisitos** → sección del sprint en ROADMAP.md
2. **Implementar** → escribir código
3. **Testear** → tests unitarios mínimo (50% cobertura)
4. **Documentar** → actualizar README.md del paquete + PROGRESS.md
5. **Commit** → pequeños commits con mensajes descriptivos

---

## Decisiones de arquitectura (por si necesitas cambiar)

| Aspecto | Elección | Alternativa |
|---|---|---|
| Framework backend | NestJS | Express, Fastify directo |
| ORM | Drizzle | Prisma, TypeORM |
| BD | Postgres local | SQLite, cloud (Supabase) |
| Job queue | BullMQ + Redis | RabbitMQ, Kafka |
| LLM | Claude API | OpenAI, Gemini, local |
| Embeddings | (Voyage o local) | OpenAI, Hugging Face |
| Frontend | Next.js | Remix, SvelteKit, Vue |
| Monorepo | pnpm workspaces | npm workspaces, Turborepo, Nx |

**Si necesitas cambiar algo:** edita primero [ARQUITECTURA.md](docs/ARQUITECTURA.md), luego actualiza el código. No cambies a ciegas.

---

## Comandos útiles

### Desarrollo

```bash
# Compilar un paquete
pnpm --filter core run build
pnpm --filter db run build

# Dev mode (hot reload)
pnpm run dev                # todos los apps en paralelo
pnpm --filter api run dev   # solo API
pnpm --filter web run dev   # solo web

# Type-check
pnpm type-check

# Lint
pnpm lint                   # ESLint
pnpm run format             # Prettier
```

### Testing

```bash
# Tests de un paquete
pnpm --filter core run test
pnpm --filter db run test

# Coverage
pnpm test:cov
```

### Docker

```bash
# Ver logs
docker compose logs -f db
docker compose logs -f redis

# Conectar a la BD
docker exec -it jobfinder-db psql -U jobfinder -d jobfinder

# Backup
docker exec jobfinder-db pg_dump -U jobfinder jobfinder > backup.sql

# Restore
docker exec -i jobfinder-db psql -U jobfinder jobfinder < backup.sql

# Limpiar todo
docker compose down -v  # -v borra volúmenes
```

---

## Estilo de código

### TypeScript
- `strict: true` (no hay `any`, tipos explícitos)
- Nombres: `camelCase` para variables/funciones, `PascalCase` para clases
- Imports: usa alias `@jobfinder/*` (configurado en tsconfig)

### Commits
```
feat: add ProfileRepository
fix: resolve type error in Job entity
refactor: simplify LLM prompt
docs: update PROGRESS.md
```

No: `wip`, `fix bug`, `asdf`, `TODO fix later`.

### Tests
- Ubicación: `*.test.ts` o `*.spec.ts` junto al archivo
- Framework: Vitest
- Cobertura mínima: 50% por sprint (aumenta después)

```ts
describe('ProfileRepository', () => {
  it('should insert a profile', async () => {
    const profile = new Profile({ ... });
    await repo.insert(profile);
    const found = await repo.findById(profile.id);
    expect(found).toBeDefined();
  });
});
```

### Documentación
- JSDoc para funciones públicas (1 línea si es obvio, sino 2–3)
- Sin comentarios de "qué hace" (el código ya lo dice)
- Sí comentarios de "por qué" (constraints, workarounds)

```ts
/**
 * Generates a CV tailored to a job description.
 * Uses Claude to select and reformat bullets (never invents data).
 */
async tailorCv(job: Job, profile: Profile, lang: Lang): Promise<TailoredCv>
```

---

## Monitoreo de calidad

### En cada sprint
- [ ] Código compila (`pnpm type-check`)
- [ ] Tests pasan (`pnpm test`)
- [ ] Lint pasa (`pnpm lint`)
- [ ] Documentación actualizada
- [ ] PROGRESS.md reflejaa el estado real

### Antes de "terminar" el proyecto
- [ ] Todos los sprints completados
- [ ] Cobertura de tests ≥ 70%
- [ ] Zero tipo-warnings
- [ ] README legible y actualizado
- [ ] Instrucciones de run en SETUP.md funcionan

---

## Troubleshooting

### "Database connection refused"
```bash
docker compose ps          # ¿Está levantado?
docker compose logs db     # ¿Hay errores?
docker compose restart db  # Reinicia
```

### "Port 5433 already in use"
```bash
# Cambia el puerto en docker-compose.yml o:
docker ps  # identifica qué ocupa 5433
docker stop <container-id>
```

### "Module not found @jobfinder/core"
```bash
pnpm install  # regenera symlinks
pnpm type-check  # verifica tsconfig paths
```

### "pnpm: command not found"
```bash
npm install -g pnpm
pnpm --version
```

---

## Recursos

- [Anthropic API docs](https://docs.anthropic.com)
- [Drizzle ORM docs](https://orm.drizzle.team)
- [NestJS docs](https://docs.nestjs.com)
- [Next.js docs](https://nextjs.org/docs)
- [PostgreSQL 16 docs](https://www.postgresql.org/docs/16)

---

## Contacto / Notas personales

Si necesitas recordar algo importante sobre este proyecto, edita este archivo o actualiza [PROGRESS.md](docs/PROGRESS.md).

**Última sesión:** 2026-06-23 — Sprint 0 completado. Lista para Sprint 1.
