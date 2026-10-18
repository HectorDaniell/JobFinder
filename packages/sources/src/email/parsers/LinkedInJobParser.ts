import type { EmailMessage, RawJob } from '@jobfinder/core';
import type { EmailJobParser } from '../EmailJobParser';

/**
 * Deterministic parser for LinkedIn job-alert emails.
 *
 * Senders:
 * - `jobalerts-noreply@linkedin.com`
 *
 * Alert emails from LinkedIn are template-generated: HTML table structure
 * containing job cards marked with `data-test-id="job-card"`.
 *
 * Produces THIN jobs: title, company, location, clean URL, externalId.
 * `description` is intentionally undefined (ADR-0029).
 * Never throws: unparseable or corrupted HTML yields [].
 */
export class LinkedInJobParser implements EmailJobParser {
  readonly name = 'linkedin';

  readonly senders = ['jobalerts-noreply@linkedin.com'] as const;

  parse(email: EmailMessage): RawJob[] {
    const html = email.bodyHtml;
    if (!html || typeof html !== 'string') {
      return [];
    }

    const jobs: RawJob[] = [];
    const chunks = html.split('data-test-id="job-card"').slice(1);

    for (const chunk of chunks) {
      const parsed = this.parseJobCard(chunk, email.receivedAt);
      if (parsed) {
        jobs.push(parsed);
      }
    }

    return jobs;
  }

  private parseJobCard(chunk: string, receivedAt: Date): RawJob | null {
    // 1. External ID & URL
    // Typical link format: https://www.linkedin.com/comm/jobs/view/4479669900/?trackingId=...
    const linkMatch = chunk.match(/href="([^"]*linkedin\.com\/(?:comm\/)?jobs\/view\/(\d+)[^"]*)"/i);
    if (!linkMatch) return null;

    const externalId = linkMatch[2];
    const rawUrl = linkMatch[1];
    const url = externalId ? `https://www.linkedin.com/jobs/view/${externalId}/` : rawUrl;

    // 2. Title
    // Located inside an anchor with class containing `font-bold`
    const titleMatch = chunk.match(/<a[^>]*class="[^"]*font-bold[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? this.stripTags(titleMatch[1]) : '';
    if (!title) return null;

    // 3. Company & Location
    // Typical format: <p class="... text-system-gray-100 ..."> Company · Location </p>
    const metaMatch = chunk.match(/<p[^>]*class="[^"]*text-system-gray-100[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    let company = '';
    let location: string | undefined;

    if (metaMatch) {
      const rawMeta = this.stripTags(metaMatch[1]);
      const parts = rawMeta.split('·').map((s) => s.trim());
      company = parts[0] || '';
      location = parts.slice(1).join(' · ') || undefined;
    }

    // Fallback for company from img alt attribute if not resolved from text
    if (!company) {
      const imgMatch = chunk.match(/<img[^>]*alt="([^"]+)"/i);
      if (imgMatch) {
        company = imgMatch[1].trim();
      }
    }

    if (!company) return null;

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
      .trim();
  }
}
