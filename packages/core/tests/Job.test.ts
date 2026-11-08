import { describe, it, expect } from 'vitest';
import { Job } from '../src';

/**
 * El estado de enriquecimiento de una vacante es DERIVADO, no almacenado: una
 * vacante "enriquecida sin descripción" no se puede construir. Estos tests
 * fijan esa propiedad, que es la que permite que el resto del embudo confíe en
 * `isEnriched` sin comprobar también el texto (ver ADR-0029).
 */

const base = {
  id: 'j-1',
  sourceId: 'gmail-alerts',
  externalId: 'ext-1',
  title: 'Senior Backend Engineer',
  company: 'Acme',
  location: 'Remote',
  modality: 'remote' as const,
  seniority: 'senior' as const,
  url: 'https://acme.example/jobs/1',
  postedAt: new Date('2026-08-01'),
  raw: {},
  dedupHash: 'acme|senior backend engineer|remote',
  ingestedAt: new Date('2026-08-01'),
};

describe('Job — estado de enriquecimiento', () => {
  it('nace DELGADA cuando la fuente no trajo descripción', () => {
    const job = new Job(base);

    expect(job.enrichmentStatus).toBe('thin');
    expect(job.isEnriched).toBe(false);
    expect(job.needsEnrichment).toBe(true);
  });

  it('está ENRIQUECIDA en cuanto tiene descripción', () => {
    const job = new Job({ ...base, description: 'Node.js y PostgreSQL.' });

    expect(job.enrichmentStatus).toBe('enriched');
    expect(job.isEnriched).toBe(true);
    expect(job.needsEnrichment).toBe(false);
  });

  it('queda NO DISPONIBLE cuando la cascada se agotó sin resolverla', () => {
    const job = new Job({ ...base, enrichmentFailed: true });

    expect(job.enrichmentStatus).toBe('unavailable');
    expect(job.isEnriched).toBe(false);
    // Lo importante: ya NO se vuelve a intentar en la siguiente ingesta.
    expect(job.needsEnrichment).toBe(false);
  });

  it('la descripción manda sobre el fallo: capturarla a mano la enriquece igual', () => {
    // El paso 4 de la cascada (captura asistida) puede llegar después de que los
    // pasos automáticos fallaran; el resultado debe ser una vacante utilizable.
    const job = new Job({ ...base, description: 'Node.js.', enrichmentFailed: true });

    expect(job.enrichmentStatus).toBe('enriched');
    expect(job.isEnriched).toBe(true);
  });

  it('`enrichmentFailed` es false por defecto (una vacante recién descubierta no ha fallado)', () => {
    expect(new Job(base).enrichmentFailed).toBe(false);
  });

  it('registra qué paso de la cascada la resolvió, para medir la tasa de acierto', () => {
    const job = new Job({ ...base, description: 'Node.js.', enrichedBy: 'greenhouse' });

    expect(job.enrichedBy).toBe('greenhouse');
  });
});
