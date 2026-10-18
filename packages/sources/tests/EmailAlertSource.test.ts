import { describe, it, expect, vi } from 'vitest';
import type { EmailMessage, EmailReaderPort, RawJob } from '@jobfinder/core';
import { EmailAlertSource } from '../src/email/EmailAlertSource';
import type { EmailJobParser } from '../src/email/EmailJobParser';

function makeMockReader(emails: EmailMessage[]): EmailReaderPort {
  return {
    search: vi.fn(async () => emails),
    test: vi.fn(async () => ({ ok: true })),
  };
}

describe('EmailAlertSource', () => {
  const sampleJob: RawJob = {
    title: 'Frontend Developer',
    company: 'Acme',
    url: 'https://example.com/job/1',
    postedAt: new Date('2026-10-18T12:00:00Z'),
    externalId: '1',
  };

  const mockParser: EmailJobParser = {
    name: 'mock-parser',
    senders: ['alerts@example.com'],
    parse: () => [sampleJob],
  };

  it('declara kind "email" y nombre configurable', () => {
    const reader = makeMockReader([]);
    const source = new EmailAlertSource(reader, [mockParser], { name: 'custom-alerts' });

    expect(source.kind).toBe('email');
    expect(source.name).toBe('custom-alerts');
  });

  it('recupera correos y devuelve las vacantes procesadas por los parsers', async () => {
    const email: EmailMessage = {
      id: 'e-1',
      from: 'Alerts <alerts@example.com>',
      subject: 'New jobs',
      receivedAt: new Date('2026-10-18T12:00:00Z'),
      bodyHtml: '<p>job</p>',
    };

    const reader = makeMockReader([email]);
    const source = new EmailAlertSource(reader, [mockParser], { query: 'label:jobs' });

    const since = new Date('2026-10-18T00:00:00Z');
    const jobs = await source.fetch(since);

    expect(reader.search).toHaveBeenCalledWith('label:jobs', since);
    expect(jobs).toEqual([sampleJob]);
  });

  it('ignora correos de remitentes desconocidos sin fallar', async () => {
    const email: EmailMessage = {
      id: 'e-unknown',
      from: 'Unknown <stranger@other.com>',
      subject: 'Hello',
      receivedAt: new Date(),
    };

    const reader = makeMockReader([email]);
    const source = new EmailAlertSource(reader, [mockParser]);

    const jobs = await source.fetch(new Date());
    expect(jobs).toEqual([]);
  });

  it('delega test() en el EmailReaderPort', async () => {
    const reader = makeMockReader([]);
    const source = new EmailAlertSource(reader, [mockParser]);

    const res = await source.test();
    expect(res).toEqual({ ok: true });
    expect(reader.test).toHaveBeenCalled();
  });
});
