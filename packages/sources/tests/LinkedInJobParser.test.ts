import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EmailMessage } from '@jobfinder/core';
import { LinkedInJobParser } from '../src/email/parsers/LinkedInJobParser';
import { parseJobAlert } from '../src/email/registry';

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures/emails/linkedin-job-alert.html'),
  'utf8'
);

function makeEmail(overrides?: Partial<EmailMessage>): EmailMessage {
  return {
    id: 'msg-linkedin-1',
    from: 'Alertas de empleo de LinkedIn <jobalerts-noreply@linkedin.com>',
    subject: 'Frontend Developer (Js, UI) en Wiraa',
    receivedAt: new Date('2026-10-18T16:25:31Z'),
    bodyHtml: fixtureHtml,
    ...overrides,
  };
}

describe('LinkedInJobParser', () => {
  const parser = new LinkedInJobParser();

  it('declara el remitente exacto de alertas de LinkedIn', () => {
    expect(parser.name).toBe('linkedin');
    expect(parser.senders).toContain('jobalerts-noreply@linkedin.com');
  });

  it('extrae todas las vacantes del HTML real sanitizado', () => {
    const email = makeEmail();
    const jobs = parser.parse(email);

    expect(jobs).toHaveLength(6);

    // Primera vacante
    expect(jobs[0]).toEqual({
      externalId: '4479669900',
      title: 'Frontend Developer (Js, UI)',
      company: 'Wiraa',
      location: 'Estados Unidos (En remoto)',
      url: 'https://www.linkedin.com/jobs/view/4479669900/',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Segunda vacante (con formato Híbrido)
    expect(jobs[1]).toEqual({
      externalId: '4472222251',
      title: 'Frontend Developer, Palantir',
      company: 'Deloitte',
      location: 'Arlington, VA (Híbrido)',
      url: 'https://www.linkedin.com/jobs/view/4472222251/',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Vacante sin sufijo de modalidad
    expect(jobs[4]).toEqual({
      externalId: '4477806982',
      title: 'Front End Developer',
      company: 'Accenture Federal Services',
      location: 'Suitland, MD',
      url: 'https://www.linkedin.com/jobs/view/4477806982/',
      postedAt: email.receivedAt,
      description: undefined,
    });

    // Vacante con formato Presencial
    expect(jobs[5]).toEqual({
      externalId: '4479697497',
      title: 'Frontend Engineer',
      company: 'Fonzi AI',
      location: 'Nueva York y alrededores (Presencial)',
      url: 'https://www.linkedin.com/jobs/view/4479697497/',
      postedAt: email.receivedAt,
      description: undefined,
    });
  });

  it('limpia las URLs de tracking dejando la canonical de LinkedIn', () => {
    const jobs = parser.parse(makeEmail());
    for (const job of jobs) {
      expect(job.url).toMatch(/^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\/$/);
      expect(job.url).not.toContain('trackingId');
      expect(job.url).not.toContain('midToken');
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

  it('degrada con gracia: HTML que no tiene estructura de job-card devuelve array vacío', () => {
    expect(parser.parse(makeEmail({ bodyHtml: '<div>Hola, no hay empleos aqui</div>' }))).toEqual([]);
  });

  it('ignora tarjetas corruptas que carecen de ID o URL de vacante', () => {
    const corruptCard = `
      <td data-test-id="job-card">
        <a class="font-bold">Puesto Sin Link</a>
      </td>
    `;
    expect(parser.parse(makeEmail({ bodyHtml: corruptCard }))).toEqual([]);
  });

  describe('Integración con parseJobAlert', () => {
    it('enruta un correo real de LinkedIn hacia LinkedInJobParser', () => {
      const email = makeEmail();
      const outcome = parseJobAlert(email, [parser]);

      expect(outcome.status).toBe('parsed');
      if (outcome.status === 'parsed') {
        expect(outcome.parser).toBe('linkedin');
        expect(outcome.jobs).toHaveLength(6);
      }
    });

    it('emite status "empty" cuando el remitente es conocido pero la plantilla no produce vacantes', () => {
      // Esta es la señal de rotura (RNF-07): LinkedIn cambió su HTML
      const brokenEmail = makeEmail({ bodyHtml: '<div>Plantilla cambiada sin job-cards</div>' });
      const outcome = parseJobAlert(brokenEmail, [parser]);

      expect(outcome).toEqual({
        status: 'empty',
        parser: 'linkedin',
      });
    });
  });
});
