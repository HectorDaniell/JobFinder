import { describe, it, expect, vi, beforeEach } from 'vitest';
import { google } from 'googleapis';
import { GmailSource } from '../src/email/GmailSource';

// Helper to encode a string to base64url
function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

describe('GmailSource', () => {
  let mockList: ReturnType<typeof vi.fn>;
  let mockGet: ReturnType<typeof vi.fn>;
  let mockGetProfile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockList = vi.fn();
    mockGet = vi.fn();
    mockGetProfile = vi.fn();

    vi.spyOn(google, 'gmail').mockReturnValue({
      users: {
        messages: {
          list: mockList,
          get: mockGet,
        },
        getProfile: mockGetProfile,
      },
    } as any);
  });

  it('construye la query con el timestamp en segundos (after:epoch)', async () => {
    mockList.mockResolvedValue({ data: { messages: [] } });

    const source = new GmailSource({
      clientId: 'mock-client-id',
      clientSecret: 'mock-secret',
    });

    const since = new Date('2026-10-18T12:00:00Z');
    const epochSec = Math.floor(since.getTime() / 1000);

    const result = await source.search('from:jobalerts-noreply@linkedin.com', since);

    expect(result).toEqual([]);
    expect(mockList).toHaveBeenCalledWith({
      userId: 'me',
      q: `from:jobalerts-noreply@linkedin.com after:${epochSec}`,
    });
  });

  it('recupera y decodifica mensajes con estructura multipart/alternative', async () => {
    const htmlContent = '<html><body><h1>Oferta</h1></body></html>';
    const textContent = 'Oferta';

    mockList.mockResolvedValue({
      data: {
        messages: [{ id: 'msg-1' }],
      },
    });

    mockGet.mockResolvedValue({
      data: {
        id: 'msg-1',
        internalDate: '1792312788974',
        payload: {
          headers: [
            { name: 'From', value: 'LinkedIn <jobalerts-noreply@linkedin.com>' },
            { name: 'Subject', value: 'Nueva alerta de empleo' },
            { name: 'Date', value: 'Sun, 18 Oct 2026 12:00:00 GMT' },
          ],
          mimeType: 'multipart/alternative',
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: toBase64Url(textContent) },
            },
            {
              mimeType: 'text/html',
              body: { data: toBase64Url(htmlContent) },
            },
          ],
        },
      },
    });

    const source = new GmailSource({
      clientId: 'mock-id',
      clientSecret: 'mock-secret',
    });

    const messages = await source.search('', new Date('2026-10-18T00:00:00Z'));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      id: 'msg-1',
      from: 'LinkedIn <jobalerts-noreply@linkedin.com>',
      subject: 'Nueva alerta de empleo',
      receivedAt: new Date('Sun, 18 Oct 2026 12:00:00 GMT'),
      bodyHtml: htmlContent,
      bodyText: textContent,
    });
  });

  it('tolera fallos al obtener un mensaje individual sin romper la búsqueda', async () => {
    mockList.mockResolvedValue({
      data: {
        messages: [{ id: 'msg-ok' }, { id: 'msg-fail' }],
      },
    });

    mockGet.mockImplementation(async ({ id }: { id: string }) => {
      if (id === 'msg-fail') {
        throw new Error('Not found or rate limited');
      }
      return {
        data: {
          id: 'msg-ok',
          payload: {
            headers: [
              { name: 'From', value: 'Glassdoor <noreply@glassdoor.com>' },
              { name: 'Subject', value: 'Alerta' },
            ],
            mimeType: 'text/html',
            body: { data: toBase64Url('<p>Ok</p>') },
          },
        },
      };
    });

    const source = new GmailSource({
      clientId: 'mock-id',
      clientSecret: 'mock-secret',
    });

    const messages = await source.search('', new Date('2026-10-18T00:00:00Z'));

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('msg-ok');
    expect(messages[0].bodyHtml).toBe('<p>Ok</p>');
  });

  describe('test() healthcheck', () => {
    it('devuelve { ok: true } cuando getProfile responde con éxito', async () => {
      mockGetProfile.mockResolvedValue({ data: { emailAddress: 'user@example.com' } });

      const source = new GmailSource({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
      });

      const res = await source.test();
      expect(res).toEqual({ ok: true });
      expect(mockGetProfile).toHaveBeenCalledWith({ userId: 'me' });
    });

    it('devuelve { ok: false, error } de forma segura cuando falla la autenticación', async () => {
      mockGetProfile.mockRejectedValue(new Error('Invalid Credentials (token expired)'));

      const source = new GmailSource({
        clientId: 'mock-id',
        clientSecret: 'mock-secret',
      });

      const res = await source.test();
      expect(res).toEqual({
        ok: false,
        error: 'Invalid Credentials (token expired)',
      });
    });
  });
});
