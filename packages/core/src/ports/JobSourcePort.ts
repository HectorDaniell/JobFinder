/**
 * Port: abstraction for any job source (email, API, RSS, etc.)
 * Implementations are in packages/sources
 *
 * This is the DISCOVERY side of ingestion: it answers "which jobs exist?", not
 * "what do they say?". Sources that happen to carry the full text (job boards
 * with an API) fill in `description`; sources that don't (alert emails,
 * aggregators that truncate on purpose) leave it out and the enrichment cascade
 * takes over. See ADR-0029 and JobEnricherPort.
 */

export interface RawJob {
  title: string;
  company: string;
  location?: string;
  /**
   * Absent when the source only announces the job. An email from LinkedIn or
   * Glassdoor is a notification — a card plus a tracking URL — so this is
   * routinely missing, and that is expected rather than a parse failure.
   */
  description?: string;
  url: string;
  postedAt: Date;
  externalId: string;
  raw?: Record<string, unknown>;
}

export interface JobSourcePort {
  readonly name: string;
  readonly kind: 'email' | 'api' | 'rss';

  /**
   * Fetch raw jobs from the source since a given date.
   * Returns unvalidated, unnormalized data.
   */
  fetch(since: Date): Promise<RawJob[]>;

  /**
   * Test the connection (e.g., test OAuth, API key, email credentials)
   */
  test(): Promise<{ ok: boolean; error?: string }>;
}
