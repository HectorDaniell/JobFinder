# JobFinder

Copiloto **personal** de búsqueda y postulación de empleo de **alta señal**.
No es un bot de postulación masiva: centraliza vacantes, las prioriza por afinidad real, **adapta
CV y carta a fondo solo para las mejores** y **mide resultados** para mejorar el *targeting*.

> **Principio rector:** maximizar la *tasa de respuesta por postulación*, no el número de postulaciones.

## Estado

🟢 **Fase 1 completa y en uso real** — creas tu perfil, tu historial (empleos,
proyectos, educación) y tu banco de bullets, pegas una oferta y descargas el CV
y la carta adaptados en PDF y DOCX, sin datos inventados. El CV sale agrupado
por contenedor, con periodos, y ninguno queda sin al menos un logro.

El Sprint 6 endureció el producto contra lo que apareció al usarlo de verdad
contra Claude: falsos positivos del anti-invención, empleos que desaparecían del
CV, el JSON de la base que no se podía consultar desde SQL, y — al generalizar
esa última corrección — `Experience` pasó de "solo empleos" a un contenedor
genérico con cobertura garantizada (ADR-0028).

🟡 **Fase 2 empezada** — su diseño está cerrado ([ADR-0029](./docs/adr/0029-ingesta-en-dos-tiempos-descubrir-y-enriquecer.md))
y los contratos de ingesta ya están en el core. La ingesta va en **dos tiempos**:
*descubrir* que una vacante existe (correo y bolsas) y *enriquecerla* con su
descripción (cascada que degrada hasta traerla tú). Falta construir los adapters.

- 📄 [Documento de Producto (PRD)](./docs/PRD.md)
- 🏗️ [Arquitectura Técnica](./docs/ARQUITECTURA.md)
- 🔄 [Cómo funciona, de punta a punta](./docs/FLUJO.md) — diagramas del flujo completo
- 🗺️ [Roadmap](./docs/ROADMAP.md) · 📈 [Progreso](./docs/PROGRESS.md) · 🧭 [Decisiones (ADR)](./docs/adr/README.md)

## Estructura

```
apps/
  api/    REST API (NestJS + Fastify) — expone el dominio por HTTP
  web/    UI (Next.js) — perfil, historial, bullets y la pantalla de tailoring
  worker/ ⬜ esqueleto: colas y tareas programadas (Fase 2)
packages/
  core/       dominio: entidades, puertos, casos de uso, errores  (no depende de nadie)
  db/         Drizzle + repositorios (Postgres)
  llm/        adapter de Claude + guardrails anti-invención
  documents/  generación de PDF/DOCX ATS-friendly
  sources/    ⬜ vacío: adapters de descubrimiento y enriquecimiento (Fase 2)
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

`Descubrir → Normalizar + dedup → Capa 1 (reglas) → Enriquecer → Capas 2–3 (embeddings, LLM)
→ Tailoring → Revisión humana → Postulación → Tracking → Aprendizaje`

El enriquecimiento va **después** del primer filtro, no antes: la Capa 1 se resuelve con
los metadatos que el correo ya trae, así que solo se paga por la descripción de las
vacantes que sobreviven.
