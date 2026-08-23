import type { EmailMessage } from '@jobfinder/core';
import type { EmailJobParser, ParseOutcome } from './EmailJobParser';

/**
 * Pull the bare address out of a `From` header.
 *
 * Gmail hands over the header as it travels: `Display Name <addr@host>`, and
 * the display name is free text a sender controls — LinkedIn alone sends the
 * same address under several. So the address is the only part worth routing on.
 *
 * Returns lowercase, or '' when there is nothing address-shaped. '' matches no
 * parser, so a malformed header degrades to `unknown-sender` (the LLM fallback)
 * instead of throwing halfway through an ingestion run.
 */
export function extractAddress(from: string): string {
  const angled = from.match(/<([^>]+)>/);
  const candidate = (angled ? angled[1] : from).trim().toLowerCase();
  return candidate.includes('@') ? candidate : '';
}

/**
 * Route one email to the parser that claims its sender.
 *
 * The registry only ROUTES. It does not fall back to the LLM itself — that
 * would make `sources` depend on `llm` and drag an API key into a package whose
 * whole point is being testable without one. It reports what happened; the
 * caller (the future `IngestJobs` use case) decides what an `unknown-sender`
 * costs. See ADR-0029.
 */
export function parseJobAlert(email: EmailMessage, parsers: readonly EmailJobParser[]): ParseOutcome {
  const address = extractAddress(email.from);
  const parser = parsers.find((p) => p.senders.includes(address));

  if (!parser) return { status: 'unknown-sender', from: address };

  const jobs = parser.parse(email);
  return jobs.length > 0
    ? { status: 'parsed', parser: parser.name, jobs }
    : { status: 'empty', parser: parser.name };
}
