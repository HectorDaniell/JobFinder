# @jobfinder/llm

LLM adapters that implement the core's `LlmPort`. Currently: a Claude-backed adapter
for tailoring CVs and cover letters.

## Structure

- `claude/adapter.ts` — `ClaudeAdapter implements LlmPort` (the plug that fulfills the contract)
- `claude/client.ts` — `ClaudeClient`: SDK wrapper with retry/backoff, timeout, error mapping and cost logging. Single entry point: `complete()`
- `claude/prompt-loader.ts` — fills `.txt` templates → `{ system, user }`
- `claude/guardrails.ts` — Zod schemas + `BulletOriginValidator` (anti-invention)
- `claude/cost-logger.ts` — per-call USD cost + model pricing
- `claude/errors.ts` — typed errors with HTTP status codes
- `claude/prompts/` — versioned `.txt` prompts (see its own README)
- `tests/` — Vitest unit + mocked tests; `tests/fixtures/` holds reusable data

## How it fits (hexagonal)

The core defines `LlmPort` (the contract); this package implements it with Claude.
It depends on `core`, never the reverse. Swapping providers = a sibling folder
(e.g. `openai/`) implementing the same port — nothing in `core` or the apps changes.
See `docs/adr/0009`–`0012`.

Layers, transport → business:

```
client.ts (talks to the SDK)
  → prompt-loader / guardrails / cost-logger (support)
    → adapter.ts (orchestrates · implements LlmPort)
```

## Usage

```ts
import { ClaudeClient, ClaudeAdapter } from '@jobfinder/llm';

const client = new ClaudeClient({ apiKey: process.env.ANTHROPIC_API_KEY! });
// bulletRepository (from @jobfinder/db) satisfies BulletProvider structurally
const adapter = new ClaudeAdapter(client, bulletRepository);

const cv = await adapter.tailorCv(job, profile, 'en');
const letter = await adapter.tailorCoverLetter(job, profile, 'en');
```

## Models & cost

Sonnet 4.6 for tailoring; Haiku 4.5 for extraction (Phase 2). Prices live in
`cost-logger.ts`. See ADR-0009.

## Testing

```bash
pnpm --filter @jobfinder/llm test           # run once
pnpm --filter @jobfinder/llm test:watch     # watch mode
pnpm --filter @jobfinder/llm test:coverage  # with coverage report
```

Real Claude is never called in tests: `ClaudeClient` and `BulletProvider` are faked.

## Status

- `tailorCv` ✅ · `tailorCoverLetter` ✅
- `scoreJob` / `extractJobs` → typed stubs (Phase 2: matching + email ingestion)
