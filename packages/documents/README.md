# @jobfinder/documents

Document adapter that turns a `TailoredCv` + a cover letter (from the LLM) into
downloadable **ATS-friendly** files (PDF and DOCX). Implements the core's
`DocumentPort`.

## Structure

- `adapter.ts` — `DocumentAdapter implements DocumentPort` (the plug: orchestrates mapper + exporter)
- `model/` — format-neutral intermediate models + **pure** mappers
  - `ResumeModel` / `buildResumeModel` — what goes in the CV (built once, drawn by every exporter)
  - `CoverLetterModel` / `buildCoverLetterModel` — the cover letter (header + paragraphs)
  - `buildHeader` — contact header, shared by CV and cover letter
- `exporters/` — draw a model into bytes for one format
  - `docx.exporter.ts` — via the `docx` library (declarative tree)
  - `pdf.exporter.ts` — via `pdfkit` (imperative stream)
- `tests/` — Vitest; `tests/fixtures/` holds reusable data

## How it fits (hexagonal)

The core defines `DocumentPort` (the contract); this package implements it. It
depends on `core`, never the reverse — not even on `llm` or `db`. Swapping the
PDF engine or adding a format (HTML, TXT) = a new exporter; nothing in `core` or
the apps changes. See `docs/adr/0013`–`0015`.

Layers, data → bytes:

```
buildResumeModel / buildCoverLetterModel   (what goes in the doc)
  → exporters (docx / pdf)                 (how it's drawn → bytes)
    → adapter.ts (orchestrates · implements DocumentPort)
```

## Usage

```ts
import { DocumentAdapter } from '@jobfinder/documents';
import type { DocumentPort } from '@jobfinder/core';

const documents: DocumentPort = new DocumentAdapter();

const cv = await documents.generateCv(tailoredCv, profile, 'en', 'pdf');
const letter = await documents.generateCoverLetter(coverText, profile, 'en', 'docx');

// each returns { bytes: Uint8Array, mimeType, filename }
// e.g. serve as an HTTP download or write to disk
```

## ATS-friendly by design

Single column, selectable text, no tables/images, standard fonts, real bullet
lists. A "pretty" multi-column CV is often unreadable to an ATS parser, so the
output favors parseability over visual flair.

## Testing

```bash
pnpm --filter @jobfinder/documents test           # run once
pnpm --filter @jobfinder/documents test:coverage  # with coverage report
```

No mocks: mappers and exporters are pure/local and deterministic, so tests use
the **real** pieces and assert on the output bytes' magic numbers (`%PDF`, `PK`).

## Status

- CV → PDF ✅ · DOCX ✅
- Cover letter → PDF ✅ · DOCX ✅
- Persisting the artifact (`DocumentRepository`) is wired later, in the app (Phase 2).
