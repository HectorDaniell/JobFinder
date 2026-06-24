# @jobfinder/core

Domain logic, entities, and use cases. Framework-agnostic.

## Structure

- `domain/entities/` — Profile, Job, Bullet (immutable, with domain logic)
- `domain/value-objects/` — JobScore (immutable results)
- `ports/` — Interfaces (JobSourcePort, LlmPort, EmbedderPort)
- `errors/` — Domain-specific errors
- `use-cases/` — Orchestration logic (to be added)

## Philosophy

- **No framework dependencies** — only `zod` for validation.
- **Ports over adapters** — the core defines what it needs; infrastructure implements it.
- **Immutable entities** — all constructors return new instances; no setters.
- **Fail-safe by default** — errors are typed and predictable.

## Usage

```ts
import { Job, Profile, JobScore } from '@jobfinder/core';

const job = new Job({ ... });
const profile = new Profile({ ... });
const score = new JobScore({ ... });
```
