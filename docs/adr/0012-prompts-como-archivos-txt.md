# ADR-0012: Prompts como archivos `.txt` versionados

> Estado: **Aceptado** · Fecha: 2026-06-27

## Contexto

Los prompts de Claude (tailor-cv, tailor-cover) son texto largo que iteraremos
con frecuencia. Hay que decidir dónde viven: ¿como constantes de string dentro
del código TypeScript, o como archivos aparte?

## Decisión

Los prompts viven como **archivos `.txt`** en
`packages/llm/src/claude/prompts/`, con secciones marcadas
(`===== SYSTEM MESSAGE =====`, `===== USER MESSAGE =====`) y placeholders
(`{JD_TEXT}`, `{BULLETS_NUMBERED_LIST}`, …).

`prompt-loader.ts` los lee en runtime, extrae las secciones y rellena los
placeholders con datos reales, devolviendo `{ system, user }`.

El versionado y el changelog de prompts se documentan en
`packages/llm/src/claude/prompts/README.md`.

## Alternativas descartadas

- **Prompts como constantes en `.ts`** — cada cambio exige recompilar; el diff
  se mezcla con lógica; no se pueden copiar/pegar fácil a claude.ai para iterar.

## Consecuencias

- Iterar un prompt = editar texto, sin tocar código.
- Versionado limpio (un archivo por versión) y auditable.
- `prompt-loader` queda **puro y testeable** (la parte de relleno no toca disco).
- **Costo:** lectura de archivo en runtime (vía `import.meta.url`). Para el
  empaquetado de producción (Sprint 4, app en CommonJS) habrá que **copiar los
  `.txt` al `dist/`** en el build, o pasar la plantilla ya cargada. Pendiente
  de resolver cuando se cablee la API.
