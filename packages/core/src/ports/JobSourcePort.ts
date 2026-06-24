/**
 * Port: abstraction for any job source (email, API, RSS, etc.)
 * Implementations are in packages/sources
 */

export interface RawJob {
  title: string;
  company: string;
  location?: string;
  description: string;
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
