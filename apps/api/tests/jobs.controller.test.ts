import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Job, IngestJobs, NotFoundError, ValidationError, type IngestReport } from '@jobfinder/core';
import type { JobRepository } from '@jobfinder/db';
import { JobsController } from '../src/jobs/jobs.controller';

const sampleJob = new Job({
  id: 'job-123',
  sourceId: 'linkedin-alerts',
  externalId: 'ext-456',
  title: 'Senior TypeScript Engineer',
  company: 'TechCorp',
  location: 'Remote',
  modality: 'remote',
  seniority: 'senior',
  description: undefined,
  url: 'https://linkedin.com/jobs/view/456',
  postedAt: new Date('2026-08-20T10:00:00Z'),
  raw: {},
  dedupHash: 'techcorp:seniortypescriptengineer:remote',
  enrichmentFailed: false,
  ingestedAt: new Date('2026-08-20T12:00:00Z'),
});

const sampleReport: IngestReport = {
  sourceName: 'email-alerts',
  totalFetched: 5,
  ingested: 3,
  duplicates: 2,
  jobs: [sampleJob],
};

let jobRepo: JobRepository;
let ingestJobs: IngestJobs;
let controller: JobsController;

const originalEnv = { ...process.env };

beforeEach(() => {
  jobRepo = {
    findRecent: vi.fn().mockResolvedValue([sampleJob]),
    findById: vi.fn().mockResolvedValue(sampleJob),
    create: vi.fn(),
    findByDedupHash: vi.fn(),
    update: vi.fn(),
  } as unknown as JobRepository;

  ingestJobs = {
    execute: vi.fn().mockResolvedValue(sampleReport),
  } as unknown as IngestJobs;

  controller = new JobsController(jobRepo, ingestJobs);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.clearAllMocks();
});

describe('JobsController', () => {
  describe('getRecent', () => {
    it('retorna vacantes recientes con el límite por defecto (50)', async () => {
      const result = await controller.getRecent();

      expect(jobRepo.findRecent).toHaveBeenCalledWith(50);
      expect(result).toEqual([sampleJob]);
    });

    it('respeta el parámetro limit indicado', async () => {
      await controller.getRecent('15');

      expect(jobRepo.findRecent).toHaveBeenCalledWith(15);
    });

    it('limita a un máximo de 100 si se pasa un número mayor', async () => {
      await controller.getRecent('250');

      expect(jobRepo.findRecent).toHaveBeenCalledWith(100);
    });
  });

  describe('getById', () => {
    it('retorna la vacante cuando existe', async () => {
      const result = await controller.getById('job-123');

      expect(jobRepo.findById).toHaveBeenCalledWith('job-123');
      expect(result).toBe(sampleJob);
    });

    it('lanza NotFoundError cuando la vacante no existe', async () => {
      vi.mocked(jobRepo.findById).mockResolvedValueOnce(null);

      await expect(controller.getById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('ingestFromEmail', () => {
    it('lanza ValidationError si faltan las variables de entorno de Gmail', async () => {
      delete process.env.GMAIL_CLIENT_ID;
      delete process.env.GMAIL_CLIENT_SECRET;
      delete process.env.GMAIL_REFRESH_TOKEN;

      await expect(controller.ingestFromEmail({})).rejects.toThrow(ValidationError);
      await expect(controller.ingestFromEmail({})).rejects.toThrow(/Gmail credentials not configured/);
    });

    it('ejecuta IngestJobs y retorna el reporte cuando las credenciales están presentes', async () => {
      process.env.GMAIL_CLIENT_ID = 'dummy-client-id';
      process.env.GMAIL_CLIENT_SECRET = 'dummy-secret';
      process.env.GMAIL_REFRESH_TOKEN = 'dummy-refresh-token';

      const report = await controller.ingestFromEmail({
        since: '2026-08-01T00:00:00.000Z',
        query: 'label:jobs',
      });

      expect(ingestJobs.execute).toHaveBeenCalledTimes(1);
      expect(ingestJobs.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          since: new Date('2026-08-01T00:00:00.000Z'),
          source: expect.objectContaining({
            name: 'email-alerts',
          }),
        })
      );
      expect(report).toEqual(sampleReport);
    });

    it('usa los últimos 7 días por defecto cuando no se indica since', async () => {
      process.env.GMAIL_CLIENT_ID = 'dummy-client-id';
      process.env.GMAIL_CLIENT_SECRET = 'dummy-secret';
      process.env.GMAIL_REFRESH_TOKEN = 'dummy-refresh-token';

      const beforeCall = Date.now();
      await controller.ingestFromEmail({});

      expect(ingestJobs.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          since: expect.any(Date),
        })
      );

      const calledSince = vi.mocked(ingestJobs.execute).mock.calls[0][0].since.getTime();
      const approxSevenDaysAgo = beforeCall - 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(calledSince - approxSevenDaysAgo)).toBeLessThan(1000);
    });
  });
});
