# ADR-0010: `TailoredCv` como contrato único en el core

> Estado: **Aceptado** · Fecha: 2026-06-27

## Contexto

El core ya definía `TailoredCv` en `packages/core/src/ports/LlmPort.ts`
(forma: `{ content, bullets, keywords }`). En el Paso 1 del Sprint 2 se creó
**un segundo `TailoredCv`** en `packages/llm/src/claude/types.ts`, con forma
distinta (`{ bullets, keywords, reasoning_summary }`). El conflicto se detectó
en el Paso 2 al inspeccionar el core antes de construir el motor.

Un contrato duplicado con dos formas distintas significa que "lo que el dominio
entiende por CV adaptado" y "lo que el adapter devuelve" pueden divergir → bugs
que aparecen lejos del origen (Sprint 3 espera `content`, el adapter nunca lo puso).

## Decisión

- **Los contratos del dominio viven SOLO en el core.** Los adapters los importan.
- `packages/llm` **re-exporta** `TailoredCv` del core por conveniencia, sin redefinirlo.
- La forma **cruda** que devuelve Claude (`selected_bullets`, …) es un tipo
  **interno** del adapter (`ClaudeTailorCvResponse`) que se **mapea** al contrato.

## Alternativas descartadas

- **Redefinir `TailoredCv` en `llm`** — duplica el contrato; las dos copias derivan.
- **Mover el contrato a `llm` e importarlo desde `core`** — invertiría la flecha
  de dependencia (`core → llm`), prohibido en hexagonal.

## Consecuencias

- Una sola fuente de verdad para el contrato.
- Cambiar de proveedor de LLM no cambia `TailoredCv`.
- Regla práctica para decidir dónde vive un tipo: **¿lo necesitan varios lados
  (core + adapter + API)? → vive en `core`. ¿Es detalle de un solo adapter? →
  vive en ese package.** Ver también [ADR-0011](0011-bulletprovider-puerto-del-consumidor.md).
