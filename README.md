# JobFinder

Copiloto **personal** de búsqueda y postulación de empleo de **alta señal**.
No es un bot de postulación masiva: centraliza vacantes, las prioriza por afinidad real, **adapta
CV y carta a fondo solo para las mejores** y **mide resultados** para mejorar el *targeting*.

> **Principio rector:** maximizar la *tasa de respuesta por postulación*, no el número de postulaciones.

## Estado

🟢 **Fase 1 completa** — el flujo de tailoring funciona de punta a punta: creas tu
perfil y tu banco de bullets, pegas una oferta y descargas el CV y la carta
adaptados en PDF y DOCX, sin datos inventados.

Siguiente: **Fase 2** (ingesta desde Gmail y APIs de bolsas + embudo de matching).

- 📄 [Documento de Producto (PRD)](./docs/PRD.md)
- 🏗️ [Arquitectura Técnica](./docs/ARQUITECTURA.md)
- 🔄 [Cómo funciona, de punta a punta](./docs/FLUJO.md) — diagramas del flujo completo
- 🗺️ [Roadmap](./docs/ROADMAP.md) · 📈 [Progreso](./docs/PROGRESS.md) · 🧭 [Decisiones (ADR)](./docs/adr/README.md)

## Estructura

```
apps/
  api/    REST API (NestJS + Fastify) — expone el dominio por HTTP
  web/    UI (Next.js) — perfil, bullets y la pantalla de tailoring
  worker/ colas y tareas programadas (Fase 2)
packages/
  core/       dominio: entidades, puertos, casos de uso, errores  (no depende de nadie)
  db/         Drizzle + repositorios (Postgres)
  llm/        adapter de Claude + guardrails anti-invención
  documents/  generación de PDF/DOCX ATS-friendly
  sources/    adapters de fuentes de vacantes (Fase 2)
```

Hexagonal: los adapters dependen de `core`; `core` no depende de nadie. El
framework (NestJS) vive solo en `apps/api`.

## Puesta en marcha

```bash
pnpm run docker:up   # Postgres (5433) + Redis
pnpm install
pnpm run migrate     # crea las tablas (solo la primera vez)
pnpm run dev:api     # API en :3001
pnpm run dev:web     # UI en :3000
```

Copia `.env.example` a `.env`. Sin `ANTHROPIC_API_KEY`, pon `USE_FAKE_LLM=true`
para probar el flujo completo con documentos reales.

## Decisiones clave

- **Estrategia:** embudo híbrido por capas (filtrar masivo barato, adaptar caro solo el top).
- **Postulación:** solo canales legítimos (email + APIs oficiales); el resto, **modo asistido**.
  Sin scraping ni auto-submit que arriesgue baneo.
- **Stack:** Node + TypeScript (monorepo) · NestJS · Postgres + pgvector · BullMQ · Claude.
- **Privacidad:** local-first, OAuth (sin contraseñas), datos personales en local.

## Flujo

`Fuentes → Ingesta → Normalización → Matching (embudo) → Tailoring → Revisión humana →
Postulación → Tracking → Aprendizaje`
