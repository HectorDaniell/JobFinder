import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Job,
  Profile,
  NotFoundError,
  TailorDocuments,
  type ProfileProvider,
  type LlmPort,
  type DocumentPort,
  type TailoredCv,
  type DocumentArtifact,
} from '../src';

// ---- fixtures ----
const profile = new Profile({
  id: 'p-1',
  fullName: 'Daniel Developer',
  email: 'daniel@example.com',
  links: {},
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  preferences: {
    targetRoles: ['Backend'],
    minSeniority: 'mid',
    preferredLocations: ['Remote'],
    modality: 'remote',
    languages: ['es', 'en'],
    dealBreakers: [],
  },
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

const job = new Job({
  id: 'j-1',
  sourceId: 'manual',
  externalId: 'ext-1',
  title: 'Senior Backend Engineer',
  company: 'Acme',
  location: 'Remote',
  modality: 'remote',
  seniority: 'senior',
  description: 'We need a backend engineer with Node.js and PostgreSQL.',
  url: 'https://acme.example/jobs/1',
  postedAt: new Date('2026-07-01'),
  raw: {},
  dedupHash: 'acme|senior backend engineer|remote',
  ingestedAt: new Date('2026-07-01'),
});

const tailoredCv: TailoredCv = {
  content: '# CV',
  bullets: ['Built X', 'Led Y'],
  keywords: ['Node.js', 'PostgreSQL'],
};

const artifact = (filename: string): DocumentArtifact => ({
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: 'application/octet-stream',
  filename,
});

// ---- dobles de los puertos (mocks) ----
let profiles: ProfileProvider;
let llm: LlmPort;
let documents: DocumentPort;

beforeEach(() => {
  profiles = { findById: vi.fn().mockResolvedValue(profile) };
  llm = {
    tailorCv: vi.fn().mockResolvedValue(tailoredCv),
    tailorCoverLetter: vi.fn().mockResolvedValue('Dear Hiring Manager, ...'),
    scoreJob: vi.fn(),
    extractJobs: vi.fn(),
  };
  documents = {
    generateCv: vi.fn().mockResolvedValue(artifact('cv.pdf')),
    generateCoverLetter: vi.fn().mockResolvedValue(artifact('cover.pdf')),
  };
});

describe('TailorDocuments', () => {
  it('orquesta LLM + documentos y devuelve cv, carta y archivos', async () => {
    const useCase = new TailorDocuments(profiles, llm, documents);

    const result = await useCase.execute({
      profileId: 'p-1',
      job,
      lang: 'en',
      formats: ['pdf'],
    });

    expect(profiles.findById).toHaveBeenCalledWith('p-1');
    expect(llm.tailorCv).toHaveBeenCalledWith(job, profile, 'en');
    expect(llm.tailorCoverLetter).toHaveBeenCalledWith(job, profile, 'en');
    expect(result.cv).toBe(tailoredCv);
    expect(result.coverLetter).toBe('Dear Hiring Manager, ...');
    expect(result.files).toHaveLength(2); // 1 CV + 1 carta (un formato)
  });

  it('genera un CV y una carta por cada formato pedido', async () => {
    const useCase = new TailorDocuments(profiles, llm, documents);

    const result = await useCase.execute({
      profileId: 'p-1',
      job,
      lang: 'es',
      formats: ['pdf', 'docx'],
    });

    expect(documents.generateCv).toHaveBeenCalledTimes(2);
    expect(documents.generateCoverLetter).toHaveBeenCalledTimes(2);
    expect(result.files).toHaveLength(4);
  });

  it('lanza NotFoundError y no llama al LLM si el perfil no existe', async () => {
    profiles.findById = vi.fn().mockResolvedValue(null);
    const useCase = new TailorDocuments(profiles, llm, documents);

    await expect(
      useCase.execute({ profileId: 'missing', job, lang: 'en', formats: ['pdf'] })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(llm.tailorCv).not.toHaveBeenCalled();
  });
});
