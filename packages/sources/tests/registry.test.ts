import { describe, it, expect } from 'vitest';
import type { EmailMessage, RawJob } from '@jobfinder/core';
import { extractAddress, parseJobAlert } from '../src/email/registry';
import type { EmailJobParser } from '../src/email/EmailJobParser';

/** A minimal EmailMessage; only `from` matters for routing. */
function email(from: string): EmailMessage {
  return {
    id: 'msg-1',
    from,
    subject: 'Nuevos empleos para ti',
    receivedAt: new Date('2026-08-12T22:17:45Z'),
    bodyHtml: '<html></html>',
  };
}

const job: RawJob = {
  title: 'Frontend Developer',
  company: 'Air Apps',
  url: 'https://example.com/jobs/view/1',
  postedAt: new Date('2026-08-12T00:00:00Z'),
  externalId: '1',
};

/** A parser that always finds one job. */
const finds: EmailJobParser = {
  name: 'stub-finds',
  senders: ['alerts@example.com', 'otheralerts@example.com'],
  parse: () => [job],
};

/** A parser that never finds anything — stands in for a broken template. */
const findsNothing: EmailJobParser = {
  name: 'stub-empty',
  senders: ['quiet@example.com'],
  parse: () => [],
};

const parsers = [finds, findsNothing];

describe('extractAddress', () => {
  it('saca la dirección de un From con nombre visible', () => {
    expect(extractAddress('Alertas de empleo de LinkedIn <jobalerts-noreply@linkedin.com>')).toBe(
      'jobalerts-noreply@linkedin.com'
    );
  });

  it('acepta un From que ya es solo la dirección', () => {
    expect(extractAddress('noreply@glassdoor.com')).toBe('noreply@glassdoor.com');
  });

  it('normaliza a minúsculas, porque el remitente controla la caja', () => {
    expect(extractAddress('LinkedIn <JobAlerts-NoReply@LinkedIn.com>')).toBe(
      'jobalerts-noreply@linkedin.com'
    );
  });

  it('ignora el nombre visible aunque contenga una arroba', () => {
    // El nombre visible es texto libre: un remitente puede escribir lo que
    // quiera ahí, incluida otra dirección. Solo la de los ángulos es real.
    expect(extractAddress('soporte@banco.com <jobalerts-noreply@linkedin.com>')).toBe(
      'jobalerts-noreply@linkedin.com'
    );
  });

  it('devuelve vacío si no hay nada con forma de dirección', () => {
    expect(extractAddress('Remitente Desconocido')).toBe('');
    expect(extractAddress('')).toBe('');
  });
});

describe('parseJobAlert', () => {
  it('enruta al parser que reclama esa dirección', () => {
    const outcome = parseJobAlert(email('Alertas <alerts@example.com>'), parsers);

    expect(outcome).toEqual({ status: 'parsed', parser: 'stub-finds', jobs: [job] });
  });

  it('un parser puede reclamar varias direcciones', () => {
    const outcome = parseJobAlert(email('otheralerts@example.com'), parsers);

    expect(outcome.status).toBe('parsed');
  });

  it('remitente conocido con cero vacantes es "empty", no "parsed" vacío', () => {
    // Esta es la señal de rotura: un correo de alerta existe PORQUE había
    // vacantes que anunciar. Cero desde un remitente conocido significa casi
    // siempre que cambió la plantilla. Colapsarlo con `parsed: []` es como se
    // pudre un parser sin que nadie se entere (RNF-07).
    const outcome = parseJobAlert(email('quiet@example.com'), parsers);

    expect(outcome).toEqual({ status: 'empty', parser: 'stub-empty' });
  });

  it('remitente desconocido cae a "unknown-sender" — el respaldo del LLM', () => {
    const outcome = parseJobAlert(email('reclutador@empresa-nueva.com'), parsers);

    expect(outcome).toEqual({ status: 'unknown-sender', from: 'reclutador@empresa-nueva.com' });
  });

  it('un From ilegible degrada a desconocido, no revienta la ingesta', () => {
    const outcome = parseJobAlert(email('???'), parsers);

    expect(outcome).toEqual({ status: 'unknown-sender', from: '' });
  });

  it('no enruta por dominio: otro remitente de la misma casa no vale', () => {
    // LinkedIn manda invitaciones y mensajes desde el mismo dominio. Si el
    // registro enrutara por dominio, una invitación llegaría al parser de
    // vacantes y saldría con cero resultados — falsificando la señal de rotura.
    const outcome = parseJobAlert(email('invitations@example.com'), parsers);

    expect(outcome.status).toBe('unknown-sender');
  });

  it('sin parsers registrados, todo es desconocido', () => {
    const outcome = parseJobAlert(email('alerts@example.com'), []);

    expect(outcome.status).toBe('unknown-sender');
  });
});
