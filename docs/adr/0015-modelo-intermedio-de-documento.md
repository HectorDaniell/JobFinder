# ADR-0015: Modelo intermedio entre el contenido y los formatos

> Estado: **Aceptado** · Fecha: 2026-07-01

## Contexto

`documents` debe producir **2 formatos** (PDF, DOCX) para **2 documentos** (CV,
carta) a partir de `TailoredCv` + `Profile` (y el texto de la carta). Si cada
exporter armara su propio contenido desde esas entradas, la lógica de "qué va en
el documento" se **duplicaría** entre PDF y DOCX y podría **divergir**.

## Decisión

Introducir un **modelo intermedio neutral al formato**, construido por
**funciones puras** (mappers), que los exporters solo **dibujan**:

- `ResumeModel` ← `buildResumeModel(cv, profile, lang)`
- `CoverLetterModel` ← `buildCoverLetterModel(letter, profile)`
- `buildHeader(profile)` — encabezado compartido por ambos

Regla: **el mapper decide el contenido; el exporter decide la presentación.**

## Alternativas descartadas

- **Cada exporter arma el contenido desde `TailoredCv`/`Profile`** — duplica la
  lógica y la localización en cada formato; divergen con el tiempo.
- **Parsear el `content` (Markdown) de `TailoredCv`** — frágil; ata la
  presentación al formato del texto que emite el LLM.

## Consecuencias

- El contenido se decide **una sola vez** (DRY); los exporters son "tontos".
- Añadir un formato (HTML, TXT) = un exporter nuevo, sin tocar mappers ni los
  otros exporters (**Open/Closed**).
- Los mappers son **puros** → se testean sin mocks (entrada → salida).
- `ResumeModel`/`CoverLetterModel` son **DTOs internos** del package (no salen de
  `documents`, no viven en `core`). Misma dicotomía que en `llm` (ver ADR-0010).
