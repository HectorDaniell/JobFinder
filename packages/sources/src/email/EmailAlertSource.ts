import type { JobSourcePort, RawJob, EmailReaderPort } from '@jobfinder/core';
import type { EmailJobParser } from './EmailJobParser';
import { parseJobAlert } from './registry';

export interface EmailAlertSourceConfig {
  name?: string;
  query?: string;
}

/**
 * Adapter: combines an EmailReaderPort (such as GmailSource) with a collection
 * of deterministic parsers (LinkedInJobParser, GlassdoorJobParser) to implement
 * JobSourcePort.
 *
 * This fulfills the DISCOVERY stage of email ingestion (ADR-0029).
 */
export class EmailAlertSource implements JobSourcePort {
  readonly name: string;
  readonly kind = 'email' as const;
  private readonly query: string;

  constructor(
    private readonly reader: EmailReaderPort,
    private readonly parsers: readonly EmailJobParser[],
    config?: EmailAlertSourceConfig
  ) {
    this.name = config?.name || 'email-alerts';
    this.query = config?.query || '';
  }

  async fetch(since: Date): Promise<RawJob[]> {
    const emails = await this.reader.search(this.query, since);
    const jobs: RawJob[] = [];

    for (const email of emails) {
      const outcome = parseJobAlert(email, this.parsers);
      if (outcome.status === 'parsed') {
        jobs.push(...outcome.jobs);
      }
    }

    return jobs;
  }

  async test(): Promise<{ ok: boolean; error?: string }> {
    return this.reader.test();
  }
}
