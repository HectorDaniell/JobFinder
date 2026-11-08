# ADR-0014: `pdfkit` para generar PDF (en vez de Puppeteer)

> Estado: **Aceptado** · Fecha: 2026-07-01

## Contexto

El Sprint 3 exporta el CV y la carta a **PDF ATS-friendly** (una columna, texto
seleccionable, sin imágenes). Hay dos familias de solución en Node:

1. **HTML → PDF con Chromium headless** (Puppeteer/Playwright): se renderiza una
   plantilla HTML+CSS y se "imprime" a PDF.
2. **Construcción programática** (`pdfkit`): se dibuja el PDF con primitivas.

El `ROADMAP` original preveía Puppeteer, pero en el **Sprint 0 se retiró**
(descarga ~300 MB de Chromium; problema de espacio).

## Decisión

Usamos **`pdfkit`**. El DOCX ya se genera con `docx` (también programático), así
que ambos exporters comparten filosofía: un modelo neutral → bytes.

## Alternativas descartadas

- **Puppeteer / Playwright** — descarga Chromium (~300 MB), arranque lento,
  binario pesado en CI, más frágil (versión de Chrome). Para un CV de una
  columna es sobredimensionado, y reintroduce lo que el Sprint 0 quitó.
- **`@react-pdf/renderer`** — mete React como dependencia en un package de
  backend; innecesario.
- **`md-to-pdf` / `markdown-pdf`** — usan Puppeteer por debajo: mismo problema.

## Consecuencias

- Liviano, sin binarios externos; mismo comportamiento en cualquier OS/CI.
- Texto seleccionable nativo (requisito ATS) sin esfuerzo.
- El layout se programa (no hay HTML/CSS), pero ATS **prefiere** layouts simples.
- `handlebars` (previsto para las plantillas HTML) queda **sin uso** → se retira.
- Diferencia de estilo con `docx`: `pdfkit` es un **stream imperativo**; el
  exporter envuelve su ciclo de vida en una Promise (`'data'`/`'end'`).
