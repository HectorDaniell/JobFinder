/**
 * Port: read-only access to the user's mailbox, for discovering job alerts.
 * Implementation: GmailSource (OAuth) in packages/sources.
 *
 * Reading is the whole contract for now. Creating drafts to apply by email is
 * Phase 3 and gets its own port — keeping them apart means the ingestion path
 * never holds a credential that can send anything on the user's behalf.
 *
 * Why the mailbox matters (ADR-0029): LinkedIn and Glassdoor already match jobs
 * against the user's own profile and CV before mailing them. That personalization
 * is free and cannot be reproduced with a parameter search, which is what makes
 * email the strongest DISCOVERY source the product has — even though it carries
 * no description at all.
 */

export interface EmailMessage {
  /** Provider-side id, used to avoid re-ingesting the same message. */
  id: string;
  /** Sender address — this is what routes the message to its parser. */
  from: string;
  subject: string;
  receivedAt: Date;
  /** Alert emails are template-generated; the HTML part is the structured one. */
  bodyHtml?: string;
  bodyText?: string;
}

export interface EmailReaderPort {
  /**
   * Fetch messages matching a provider query (e.g. a Gmail search expression)
   * received since a given date.
   */
  search(query: string, since: Date): Promise<EmailMessage[]>;

  /** Verify credentials without fetching anything (OAuth token still valid?). */
  test(): Promise<{ ok: boolean; error?: string }>;
}
