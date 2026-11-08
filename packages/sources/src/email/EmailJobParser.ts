import type { EmailMessage, RawJob } from '@jobfinder/core';

/**
 * A deterministic parser for ONE sender's job-alert emails.
 *
 * Alert emails are template-generated: LinkedIn's HTML is identical across every
 * alert LinkedIn sends. That makes a hand-written parser free, faster and
 * testable, where running the same HTML through an LLM would be a permanent
 * variable cost for a solved problem. The LLM is the FALLBACK, not the default
 * (ADR-0029, which inverts RF-06).
 *
 * Parsers are PURE FUNCTIONS: fixture email in, RawJob[] out. No network, no
 * Gmail, no LLM — so their tests are ordinary unit tests.
 *
 * They produce THIN jobs: title, company, location, URL. The description is not
 * in the email at all (that is the whole premise of ADR-0029), so a parser that
 * leaves `description` undefined is working correctly, not failing.
 */
export interface EmailJobParser {
  /**
   * Which parser handled a given email. Recorded so that, when a template
   * changes and a parser starts coming back empty, the alert names the file to
   * fix instead of just reporting that ingestion got quieter.
   */
  readonly name: string;

  /**
   * Exact sender addresses this parser claims, lowercase.
   *
   * Exact addresses rather than the domain, deliberately: LinkedIn sends
   * connection requests, messages and newsletters from that same domain, and
   * routing those into a job parser would produce zero jobs — which is the
   * signal this design reserves for "the template broke". Matching narrowly
   * keeps that signal meaningful.
   */
  readonly senders: readonly string[];

  /** Extract every job card in the email. Never throws: an unparseable email yields []. */
  parse(email: EmailMessage): RawJob[];
}

/**
 * What the registry concluded about one email.
 *
 * The three cases are deliberately distinct, because they call for three
 * different reactions and collapsing them is how parser rot goes unnoticed:
 *
 * - `parsed`         — worked. Ingest the jobs.
 * - `empty`          — a KNOWN sender produced nothing. An alert email exists
 *                      because there were jobs to announce, so zero jobs almost
 *                      always means the sender changed their template. This is
 *                      the breakage signal: visible and actionable (RNF-07).
 * - `unknown-sender` — nobody claims this address. Legitimate and expected;
 *                      it is what hands the email to the LLM fallback.
 */
export type ParseOutcome =
  | { status: 'parsed'; parser: string; jobs: RawJob[] }
  | { status: 'empty'; parser: string }
  | { status: 'unknown-sender'; from: string };
