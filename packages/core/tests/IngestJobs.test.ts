import { describe, it, expect, vi } from 'vitest';
import { IngestJobs, type JobStore } from '../src/use-cases/IngestJobs';
import { Job, type JobSourcePort, type RawJob } from '../src';

function createMockJobStore(): JobStore & { jobs: Job[] } {
  const jobs: Job[] = [];
  return {
    jobs,
    create: vi.fn(async (job: Job) => {
      jobs.push(job);
      return job;
    }),
    findByDedupHash: vi.fn(async (hash: string) => {
      return jobs.find((j) => j.dedupHash === hash) || null;
    }),
  };
}

function createMockSource(name: string, rawJobs: RawJob[]): JobSourcePort {
  return {
    name,
    kind: 'email',
    fetch: vi.fn(async () => rawJobs),
    test: vi.fn(async () => ({ ok: true })),
  };
}

describe('IngestJobs', () => {
  const sampleRawJob1: RawJob = {
    title: 'Frontend Developer (Js, UI)',
    company: 'Wiraa',
    location: 'Estados Unidos (En remoto)',
    url: 'https://www.linkedin.com/jobs/view/4479669900/',
    postedAt: new Date('2026-10-18T16:25:31Z'),
    externalId: '4479669900',
  };

  const sampleRawJob2: RawJob = {
    title: 'Senior React Developer',
    company: 'Tecdata Engineering',
    location: 'Madrid',
    url: 'https://www.glassdoor.com/partner/jobListing.htm?jobListingId=1010270355378',
    postedAt: new Date('2026-10-18T08:39:49Z'),
    externalId: '1010270355378',
  };

  it('ingiere vacantes nuevas y las persiste como delgadas', async () => {
    const store = createMockJobStore();
    const source = createMockSource('linkedin-alerts', [sampleRawJob1, sampleRawJob2]);
    const useCase = new IngestJobs(store);

    const report = await useCase.execute({
      source,
      since: new Date('2026-10-18T00:00:00Z'),
    });

    expect(report.sourceName).toBe('linkedin-alerts');
    expect(report.totalFetched).toBe(2);
    expect(report.ingested).toBe(2);
    expect(report.duplicates).toBe(0);
    expect(report.jobs).toHaveLength(2);

    expect(store.jobs).toHaveLength(2);
    const first = store.jobs[0];
    expect(first.title).toBe('Frontend Developer (Js, UI)');
    expect(first.company).toBe('Wiraa');
    expect(first.enrichmentStatus).toBe('thin');
    expect(first.isEnriched).toBe(false);
    expect(first.sourceId).toBe('linkedin-alerts');
  });

  it('omite vacantes duplicadas calculando el dedupHash', async () => {
    const store = createMockJobStore();
    const source = createMockSource('linkedin-alerts', [sampleRawJob1, sampleRawJob2]);
    const useCase = new IngestJobs(store);

    // Primera ejecución: entran las 2
    await useCase.execute({ source, since: new Date() });
    expect(store.jobs).toHaveLength(2);

    // Segunda ejecución con las mismas vacantes: 0 ingresadas, 2 duplicadas
    const report2 = await useCase.execute({ source, since: new Date() });
    expect(report2.totalFetched).toBe(2);
    expect(report2.ingested).toBe(0);
    expect(report2.duplicates).toBe(2);
    expect(store.jobs).toHaveLength(2);
  });

  it('maneja una fuente que no devuelve vacantes', async () => {
    const store = createMockJobStore();
    const source = createMockSource('empty-source', []);
    const useCase = new IngestJobs(store);

    const report = await useCase.execute({ source, since: new Date() });
    expect(report.totalFetched).toBe(0);
    expect(report.ingested).toBe(0);
    expect(report.duplicates).toBe(0);
    expect(report.jobs).toEqual([]);
    expect(store.jobs).toHaveLength(0);
  });
});
