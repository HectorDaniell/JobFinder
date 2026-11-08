import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EmailMessage } from '@jobfinder/core';
import { GlassdoorJobParser } from '../src/email/parsers/GlassdoorJobParser';
import { parseJobAlert } from '../src/email/registry';

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures/emails/glassdoor-job-alert.html'),
  'utf8'
);

function makeEmail(overrides?: Partial<EmailMessage>): EmailMessage {
  return {
    id: 'msg-glassdoor-1',
    from: 'Empleos de Glassdoor <noreply@glassdoor.com>',
    subject: 'Oferta de Full Stack Developer en SeproTec Multilingual Solutions para ti',
    receivedAt: new Date('2026-10-18T08:39:49Z'),
    bodyHtml: fixtureHtml,
    ...overrides,
  };
}

describe('GlassdoorJobParser', () => {
  const parser = new GlassdoorJobParser();

  it('declara los remitentes de alertas de Glassdoor', () => {
    expect(parser.name).toBe('glassdoor');
    expect(parser.senders).toContain('noreply@glassdoor.com');
    expect(parser.senders).toContain('noreply@glassdoor.es');
  });

  it('extrae todas las vacantes del HTML real sanitizado', () => {
    const email = makeEmail();
    const jobs = parser.parse(email);

    expect(jobs).toHaveLength(5);

    // Primera vacante
    expect(jobs[0]).toEqual({
      externalId: '1010286013526',
      title: 'Ingeniero Junior de Sistemas Contra Incendios',
      company: 'SERVOTEC S.A.C',
      location: 'Carabayllo',
      url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010286013526',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Segunda vacante
    expect(jobs[1]).toEqual({
      externalId: '1010296322202',
      title: 'FrontEnd Developer',
      company: 'Napptilus Tech Labs',
      location: 'Barcelona',
      url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010296322202',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Tercera vacante (la del asunto del correo)
    expect(jobs[2]).toEqual({
      externalId: '1010286782569',
      title: 'Full Stack Developer',
      company: 'SeproTec Multilingual Solutions',
      location: 'Madrid',
      url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010286782569',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Cuarta vacante
    expect(jobs[3]).toEqual({
      externalId: '1010277150572',
      title: 'Desarrollador Full Stack',
      company: 'ADRIA INGENIEROS SAC',
      location: 'Ate',
      url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010277150572',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Quinta vacante
    expect(jobs[4]).toEqual({
      externalId: '1010270355378',
      title: 'Senior React Developer',
      company: 'Tecdata Engineering',
      location: 'Madrid',
      url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010270355378',
      postedAt: email.receivedAt,
      description: undefined,
    });
  });

  it('limpia las URLs de tracking dejando la canonical de partner', () => {
    const jobs = parser.parse(makeEmail());
    for (const job of jobs) {
      expect(job.url).toMatch(
        /^https:\/\/www\.glassdoor\.com\/partner\/jobListing\.htm\?jobListingId=\d+$/
      );
      expect(job.url).not.toContain('utm_medium');
      expect(job.url).not.toContain('utm_source');
    }
  });

  it('produce vacantes delgadas (description undefined)', () => {
    const jobs = parser.parse(makeEmail());
    for (const job of jobs) {
      expect(job.description).toBeUndefined();
    }
  });

  it('degrada con gracia: body vacío o ausente devuelve array vacío', () => {
    expect(parser.parse(makeEmail({ bodyHtml: '' }))).toEqual([]);
    expect(parser.parse(makeEmail({ bodyHtml: undefined }))).toEqual([]);
  });

  it('degrada con gracia: HTML sin estructura de ofertas devuelve array vacío', () => {
    expect(parser.parse(makeEmail({ bodyHtml: '<div>No hay vacantes aquí</div>' }))).toEqual([]);
  });

  describe('Integración con parseJobAlert', () => {
    it('enruta un correo real de Glassdoor hacia GlassdoorJobParser', () => {
      const email = makeEmail();
      const outcome = parseJobAlert(email, [parser]);

      expect(outcome.status).toBe('parsed');
      if (outcome.status === 'parsed') {
        expect(outcome.parser).toBe('glassdoor');
        expect(outcome.jobs).toHaveLength(5);
      }
    });

    it('emite status "empty" cuando el remitente es conocido pero la plantilla no produce vacantes', () => {
      // Señal de rotura (RNF-07): Glassdoor cambió su marcado
      const brokenEmail = makeEmail({ bodyHtml: '<div>Plantilla cambiada sin enlaces de vacante</div>' });
      const outcome = parseJobAlert(brokenEmail, [parser]);

      expect(outcome).toEqual({
        status: 'empty',
        parser: 'glassdoor',
      });
    });
  });
});
