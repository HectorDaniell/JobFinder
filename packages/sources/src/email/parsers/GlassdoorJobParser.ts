import type { EmailMessage, RawJob } from '@jobfinder/core';
import type { EmailJobParser } from '../EmailJobParser';

/**
 * Deterministic parser for Glassdoor job-alert emails.
 *
 * Senders:
 * - `noreply@glassdoor.com`
 * - `noreply@glassdoor.es`
 *
 * Glassdoor alert emails wrap each job card in an anchor with `jobListingId=<id>`
 * and structure company, title, and location in structured table rows.
 *
 * Produces THIN jobs: title, company, location, clean canonical URL, externalId.
 * `description` is intentionally undefined (ADR-0029).
 * Never throws: unparseable or corrupted HTML yields [].
 */
export class GlassdoorJobParser implements EmailJobParser {
  readonly name = 'glassdoor';

  readonly senders = ['noreply@glassdoor.com', 'noreply@glassdoor.es'] as const;

  parse(email: EmailMessage): RawJob[] {
    const html = email.bodyHtml;
    if (!html || typeof html !== 'string') {
      return [];
    }

    const jobs: RawJob[] = [];
    // Glassdoor wraps each card in an <a> tag linking to partner/jobListing.htm with jobListingId
    const cardRegex =
      /<a[^>]*href="([^"]*partner\/jobListing\.htm[^"]*jobListingId=(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = cardRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      const externalId = match[2];
      const cardHtml = match[3];

      const parsed = this.parseJobCard(cardHtml, externalId, rawUrl, email.receivedAt);
      if (parsed) {
        jobs.push(parsed);
      }
    }

    return jobs;
  }

  private parseJobCard(
    chunk: string,
    externalId: string,
    rawUrl: string,
    receivedAt: Date
  ): RawJob | null {
    // 1. Title
    // Located in a <p> element with font-weight:600
    const titleMatch = chunk.match(/<p[^>]*font-weight:600[^>]*>([\s\S]*?)<\/p>/i);
    const title = titleMatch ? this.stripTags(titleMatch[1]) : '';
    if (!title) return null;

    // 2. Company
    // Located in a <span> element with word-break:break-word
    const companyMatch = chunk.match(/<span[^>]*word-break:break-word[^>]*>([\s\S]*?)<\/span>/i);
    const company = companyMatch ? this.stripTags(companyMatch[1]) : '';
    if (!company) return null;

    // 3. Location
    // Located in a <p> element with font-size:12px and margin-top:4px
    const locMatch = chunk.match(/<p[^>]*font-size:12px[^>]*margin-top:4px[^>]*>([\s\S]*?)<\/p>/i);
    const location = locMatch ? this.stripTags(locMatch[1]) : undefined;

    // Canonical Glassdoor partner URL without the huge noise/tracking query params
    const url = externalId
      ? `https://www.glassdoor.com/partner/jobListing.htm?jobListingId=${externalId}`
      : rawUrl;

    return {
      title,
      company,
      location: location || undefined,
      url,
      postedAt: receivedAt,
      externalId,
    };
  }

  private stripTags(str: string): string {
    return str
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .trim();
  }
}
