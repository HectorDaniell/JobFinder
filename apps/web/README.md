# web (JobFinder UI)

Next.js 14 (App Router) frontend for JobFinder. It consumes the REST API and is
the only place a human touches: set up a profile, curate the bullet bank, paste a
job posting and download the tailored CV and cover letter.

## Screens

| Route | What it does |
|---|---|
| `/` | Landing. With a profile already set up it redirects to `/tailor` |
| `/setup` | 3-step wizard creating the profile (basics → summaries → preferences) |
| `/tailor` | **The core screen**: paste a posting → generate → preview in tabs → download |
| `/bullets` | The bullet bank: create, edit inline, delete |
| `/profile` | View the profile and edit job preferences |

Navigation is a floating pill header; `/setup` is not linked — you only land
there when no profile exists.

## Structure

- `app/` — one folder per route (App Router). `layout.tsx` is the entry point:
  it declares `<html>`, loads the fonts, mounts the header and the profile context
- `components/`
  - `ui/fields.tsx`, `ui/TagInput.tsx` — controlled form primitives
  - `ProfileProvider.tsx` — React Context holding the active `profileId`
  - `Header.tsx`, `ThemeToggle.tsx`, `BulletForm.tsx`, `PreferencesFields.tsx`
- `lib/`
  - `api.ts` — the only place that speaks HTTP; returns DTOs or `ApiError`
  - `types.ts` — wire DTOs (the actual JSON), reusing core's pure types
  - `download.ts` — base64 → bytes → Blob → file download

## How data flows

```
page  →  lib/api.ts  →  HTTP  →  apps/api  →  packages/*
  ↑                                   │
  └──── DTO, or ApiError { code, field? } ────┘
```

Pages never call `fetch` and never build URLs. Domain errors keep their `code`
across the wire, so the UI can act on them: `PROFILE_HAS_NO_BULLETS` renders a
panel linking to `/bullets`, and a validation `field` marks the exact input.

## State

Three kinds, each handled with the simplest thing that works — no Redux:

| Kind | Example | Where it lives |
|---|---|---|
| Server state | profile, bullets, tailor result | in the API; fetched on demand |
| Global client state | active `profileId`, theme | Context + `localStorage` |
| Local UI state | form drafts, active tab, loading | `useState` in the component |

See `docs/adr/0020`.

## Design system ("Señal")

Emerald accent on a neutral base, translucent surfaces with blur, floating pill
header. Colours are CSS variables in RGB-channel form (`--accent: 52 211 153`),
which lets Tailwind apply opacity: `bg-accent/10`. Light and dark are the *same*
components with different token values. See `docs/adr/0021`.

## Running

```bash
pnpm --filter web dev     # http://localhost:3000
```

Needs the API on `http://localhost:3001` (`NEXT_PUBLIC_API_URL`, see
`.env.example`). Without an `ANTHROPIC_API_KEY`, set `USE_FAKE_LLM=true` in the
root `.env` to exercise the whole flow — the documents produced are still real
PDFs and DOCX files (`docs/adr/0022`).

```bash
pnpm --filter web type-check
```

## Status

Phase 1 complete: profile, bullets and tailoring all work end to end. Not built
yet: importing a CV from Google Docs (RF-04), and everything from Phase 2 on
(job ingestion, the matching inbox, application tracking). There is no auth —
the app is single-user and local-first.
