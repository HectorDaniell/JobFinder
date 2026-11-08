# @jobfinder/db

Persistence layer: Drizzle ORM schema, migrations and repositories. Implements the
data side that the domain needs, mapping DB rows ↔ core entities.

## Structure

- `src/schema.ts` — Drizzle tables: `profile`, `bullet`, `source`, `job`, `job_score`,
  `application`, `application_event`, `document`, `llm_usage`, `email_message`
- `src/db.ts` — Drizzle client (reads `DATABASE_URL`)
- `src/repositories/` — repositories that return **core entities**, not raw rows:
  - `ProfileRepository`
  - `BulletRepository`
  - `JobRepository`
  - `JobScoreRepository`
- `scripts/migrate.js` — run migrations
- `scripts/seed.ts` — load sample data

> Note: the schema defines all the tables (incl. `application`, `source`, `email_message`),
> but only the 4 repositories above are implemented so far. The rest get their
> repositories when their feature lands (Phase 2/3).

## Philosophy

- **Repositories return entities, not rows** — the SQL↔domain mapping happens at this boundary.
- **The core never imports this package** — apps wire repositories into use cases / adapters.
- **Local-first** — Postgres runs in Docker (port 5433).

## Usage

```ts
import { db, BulletRepository } from '@jobfinder/db';

const bullets = new BulletRepository(db);
const bank = await bullets.findByProfileId(profileId); // → Bullet[]
```

## Scripts

```bash
pnpm --filter @jobfinder/db migrate   # create tables (run once)
pnpm --filter @jobfinder/db seed      # load sample data
pnpm --filter @jobfinder/db build     # compile
```

## Notes

- `DATABASE_URL` comes from `.env`
  (e.g. `postgresql://jobfinder:localdev@localhost:5433/jobfinder`).
- pgvector / embeddings columns are deferred to Phase 2.
