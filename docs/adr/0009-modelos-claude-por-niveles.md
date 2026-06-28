# ADR-0009: Modelos Claude por niveles (Sonnet para tailoring)

> Estado: **Aceptado** · Fecha: 2026-06-27 · Refina a ADR-003

## Contexto

`ARQUITECTURA.md` (ADR-003) fijó "Claude para razonamiento", pero sin elegir un
modelo concreto. El plan inicial del Sprint 2 apuntaba a
`claude-3-5-sonnet-20241022`. Al verificarlo contra la referencia oficial de la
API, ese modelo está **retirado** (octubre 2025) → usarlo daría error 404.

Además, el RNF-02 del PRD exige **control de costo por niveles** (Haiku → Sonnet
→ Opus): usar el modelo más barato que haga bien cada trabajo.

## Decisión

| Operación | Modelo | Por qué |
|-----------|--------|---------|
| `tailorCv` / `tailorCoverLetter` | **`claude-sonnet-4-6`** | Sweet spot costo/calidad para Fase 1 |
| `extractJobs` (Fase 2) | **`claude-haiku-4-5`** | Parsing barato y en volumen |
| (reservado) | `claude-opus-4-8` | Solo si una operación exige máximo razonamiento |

- IDs **sin sufijo de fecha** (son completos así).
- Precios centralizados en `packages/llm/src/claude/cost-logger.ts` (`MODEL_PRICING`).
- Temperatura: 0.3 para `tailorCv` (determinista), ~0.7 para la carta (más natural).

## Alternativas descartadas

- **Opus 4.8 para tailoring** — cuesta ~1.7× lo de Sonnet 4.6 por token
  ($5/$25 vs $3/$15 por millón). El tailoring es una selección determinista; no
  justifica el sobreprecio.
- **Haiku para tailoring** — demasiado simple; pierde matices al alinear CV↔JD.
- **Mantener `claude-3-5-sonnet-20241022`** — retirado; rompería en runtime.

## Consecuencias

- Costo estimado ~**$0.005 por tailor** → sostenible (RNF-02).
- Un único lugar para actualizar precios o cambiar de nivel (una constante).
- Si los precios/IDs cambian, se actualizan en `cost-logger.ts`, no dispersos.
