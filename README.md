# JobFinder

Copiloto **personal** de búsqueda y postulación de empleo de **alta señal**.
No es un bot de postulación masiva: centraliza vacantes, las prioriza por afinidad real, **adapta
CV y carta a fondo solo para las mejores** y **mide resultados** para mejorar el *targeting*.

> **Principio rector:** maximizar la *tasa de respuesta por postulación*, no el número de postulaciones.

## Estado

🟡 **Planificación / Diseño** — sin código todavía. Documentación primero.

- 📄 [Documento de Producto (PRD)](./docs/PRD.md)
- 🏗️ [Arquitectura Técnica](./docs/ARQUITECTURA.md)

## Decisiones clave

- **Estrategia:** embudo híbrido por capas (filtrar masivo barato, adaptar caro solo el top).
- **Postulación:** solo canales legítimos (email + APIs oficiales); el resto, **modo asistido**.
  Sin scraping ni auto-submit que arriesgue baneo.
- **Stack:** Node + TypeScript (monorepo) · NestJS · Postgres + pgvector · BullMQ · Claude.
- **Privacidad:** local-first, OAuth (sin contraseñas), datos personales en local.

## Flujo

`Fuentes → Ingesta → Normalización → Matching (embudo) → Tailoring → Revisión humana →
Postulación → Tracking → Aprendizaje`
