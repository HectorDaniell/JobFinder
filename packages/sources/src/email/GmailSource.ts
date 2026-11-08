import { google, type gmail_v1, type Auth } from 'googleapis';
import type { EmailMessage, EmailReaderPort } from '@jobfinder/core';

export type OAuth2Client = Auth.OAuth2Client;


export interface GmailSourceConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  refreshToken?: string;
}

/**
 * Adapter: read-only access to Gmail via official googleapis.
 * Implements EmailReaderPort from @jobfinder/core.
 *
 * Scope required: https://www.googleapis.com/auth/gmail.readonly
 *
 * Traverses Gmail's multipart message payloads, decodes base64url content,
 * extracts headers, and yields normalized EmailMessage items ready for
 * deterministic parsing.
 */
export class GmailSource implements EmailReaderPort {
  private readonly gmail: gmail_v1.Gmail;

  constructor(authOrConfig: OAuth2Client | GmailSourceConfig) {
    let authClient: OAuth2Client;

    if ('getRequestHeaders' in authOrConfig) {
      authClient = authOrConfig;
    } else {
      authClient = new google.auth.OAuth2(
        authOrConfig.clientId,
        authOrConfig.clientSecret,
        authOrConfig.redirectUri
      );
      if (authOrConfig.refreshToken) {
        authClient.setCredentials({ refresh_token: authOrConfig.refreshToken });
      }
    }

    this.gmail = google.gmail({ version: 'v1', auth: authClient });
  }

  /**
   * Search messages matching a query received since a given date.
   */
  async search(query: string, since: Date): Promise<EmailMessage[]> {
    const afterEpoch = Math.floor(since.getTime() / 1000);
    const q = query ? `${query} after:${afterEpoch}` : `after:${afterEpoch}`;

    const listRes = await this.gmail.users.messages.list({
      userId: 'me',
      q,
    });

    const messageHeaders = listRes.data.messages || [];
    if (messageHeaders.length === 0) {
      return [];
    }

    const emails: EmailMessage[] = [];

    // Fetch full message details in parallel
    const details = await Promise.all(
      messageHeaders.map(async (item) => {
        if (!item.id) return null;
        try {
          const res = await this.gmail.users.messages.get({
            userId: 'me',
            id: item.id,
            format: 'full',
          });
          return res.data;
        } catch {
          return null;
        }
      })
    );

    for (const msg of details) {
      if (!msg || !msg.id) continue;

      const headers = msg.payload?.headers || [];
      const from = this.getHeader(headers, 'from');
      const subject = this.getHeader(headers, 'subject');
      const dateHeader = this.getHeader(headers, 'date');

      const receivedAt = dateHeader
        ? new Date(dateHeader)
        : msg.internalDate
          ? new Date(Number(msg.internalDate))
          : new Date();

      const { bodyHtml, bodyText } = this.extractBody(msg.payload);

      emails.push({
        id: msg.id,
        from,
        subject,
        receivedAt,
        bodyHtml: bodyHtml || undefined,
        bodyText: bodyText || undefined,
      });
    }

    return emails;
  }

  /**
   * Test credentials and connectivity without fetching messages.
   */
  async test(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.gmail.users.getProfile({ userId: 'me' });
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }

  private getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string {
    const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return found?.value || '';
  }

  /**
   * Traverses a MIME payload tree and decodes text/html and text/plain parts.
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart): { bodyHtml?: string; bodyText?: string } {
    let bodyHtml: string | undefined;
    let bodyText: string | undefined;

    if (!payload) return { bodyHtml, bodyText };

    const traverse = (part: gmail_v1.Schema$MessagePart): void => {
      const mimeType = part.mimeType?.toLowerCase() || '';

      if (mimeType === 'text/html' && part.body?.data && !bodyHtml) {
        bodyHtml = this.decodeBase64Url(part.body.data);
      } else if (mimeType === 'text/plain' && part.body?.data && !bodyText) {
        bodyText = this.decodeBase64Url(part.body.data);
      }

      if (part.parts && Array.isArray(part.parts)) {
        for (const child of part.parts) {
          traverse(child);
        }
      }
    };

    traverse(payload);
    return { bodyHtml, bodyText };
  }

  /**
   * Decodes a base64url-encoded string (RFC 4648) to UTF-8.
   */
  private decodeBase64Url(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf8');
  }
}
