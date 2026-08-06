import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Job,
  Profile,
  Experience,
  Bullet,
  NotFoundError,
  TailorDocuments,
  type ProfileProvider,
  type ExperienceProvider,
  type BulletProvider,
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

const experience = new Experience({
  id: 'exp-1',
  profileId: 'p-1',
  company: 'PrevCo',
  role: 'Backend Developer',
  startDate: new Date('2024-01-01'),
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

const tailoredCv: TailoredCv = {
  content: '# CV',
  bullets: [
    { text: 'Built X', category: 'experience', experienceId: 'exp-1', skills: ['Node.js'] },
    { text: 'Led Y', category: 'achievement', skills: ['Node.js', 'Docker'] },
  ],
  keywords: ['Node.js', 'PostgreSQL'],
};

/** Fábrica corta: solo importan category/sourceRole en estos tests. */
const bankBullet = (id: string, category: Bullet['category'], text: string) =>
  new Bullet({
    id,
    profileId: 'p-1',
    textEs: text,
    textEn: text,
    skills: [],
    category,
    sourceRole: 'Universidad X',
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
  });

const educationBullet = bankBullet('b-edu', 'education', 'BSc in Systems Engineering');

const artifact = (filename: string): DocumentArtifact => ({
  bytes: new Uint8Array([1, 2, 3]),
  mimeType: 'application/octet-stream',
  filename,
});

// ---- dobles de los puertos (mocks) ----
let profiles: ProfileProvider;
let experiences: ExperienceProvider;
let bullets: BulletProvider;
let llm: LlmPort;
let documents: DocumentPort;

beforeEach(() => {
  profiles = { findById: vi.fn().mockResolvedValue(profile) };
  experiences = { findByProfileId: vi.fn().mockResolvedValue([experience]) };
  // Banco SIN educación por defecto: así el CV pasa intacto y los tests de
  // orquestación pueden comparar por referencia. La educación tiene su test.
  bullets = {
    findByProfileId: vi.fn().mockResolvedValue([bankBullet('b-1', 'experience', 'Built X')]),
  };
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
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({
      profileId: 'p-1',
      job,
      lang: 'en',
      formats: ['pdf'],
    });

    expect(profiles.findById).toHaveBeenCalledWith('p-1');
    expect(llm.tailorCv).toHaveBeenCalledWith(job, profile, 'en');
    expect(llm.tailorCoverLetter).toHaveBeenCalledWith(job, profile, 'en');
    // El CV ya no es el objeto que devolvió el LLM: el caso de uso lo COMPONE
    // (educación + skills curadas). Los bullets adaptados sí pasan intactos.
    expect(result.cv.bullets).toEqual(tailoredCv.bullets);
    expect(result.cv.content).toBe(tailoredCv.content);
    expect(result.coverLetter).toBe('Dear Hiring Manager, ...');
    expect(result.files).toHaveLength(2); // 1 CV + 1 carta (un formato)
  });

  it('carga las experiencias del perfil y se las pasa a generateCv (Paso 1d: agrupar el CV)', async () => {
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    expect(experiences.findByProfileId).toHaveBeenCalledWith('p-1');
    // Se renderiza EXACTAMENTE el mismo CV que se devuelve para el preview:
    // lo que el usuario ve en pantalla es lo que sale en el archivo.
    expect(documents.generateCv).toHaveBeenCalledWith(
      result.cv,
      profile,
      [experience],
      'en',
      'pdf'
    );
  });

  it('añade la educación del banco aunque el LLM no la haya seleccionado', async () => {
    bullets.findByProfileId = vi.fn().mockResolvedValue([educationBullet]);
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    // Los 2 bullets adaptados por el LLM + el de educación, con su contexto.
    expect(result.cv.bullets).toHaveLength(3);
    expect(result.cv.bullets[2]).toEqual({
      text: 'BSc in Systems Engineering',
      category: 'education',
      experienceId: undefined,
      sourceRole: 'Universidad X',
      skills: [],
    });
  });

  it('no duplica la educación si el LLM ya la seleccionó', async () => {
    bullets.findByProfileId = vi.fn().mockResolvedValue([educationBullet]);
    llm.tailorCv = vi.fn().mockResolvedValue({
      ...tailoredCv,
      bullets: [
        { text: 'BSc, reformulado', category: 'education', sourceRole: 'Universidad X', skills: [] },
      ],
    });
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    // Gana la versión del LLM: ya adaptada a la vacante.
    expect(result.cv.bullets).toHaveLength(1);
    expect(result.cv.bullets[0].text).toBe('BSc, reformulado');
  });

  it('sustituye las keywords del LLM por las skills curadas de los bullets elegidos', async () => {
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    // 'PostgreSQL' venía de las keywords del LLM pero no es tag de ningún
    // bullet: desaparece. Solo queda lo que el usuario curó y el CV respalda.
    expect(result.cv.keywords).toEqual(['Node.js', 'Docker']);
  });

  it('ordena las skills: primero las que aparecen en la oferta', async () => {
    llm.tailorCv = vi.fn().mockResolvedValue({
      ...tailoredCv,
      // 'Docker' no está en la descripción del job; 'PostgreSQL' sí, y encima
      // sostiene menos bullets — la relevancia para la vacante manda.
      bullets: [
        { text: 'a', category: 'experience', skills: ['Docker'] },
        { text: 'b', category: 'experience', skills: ['Docker', 'PostgreSQL'] },
      ],
    });
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    expect(result.cv.keywords).toEqual(['PostgreSQL', 'Docker']);
  });

  it('colapsa las skills repetidas que solo difieren en mayúsculas', async () => {
    llm.tailorCv = vi.fn().mockResolvedValue({
      ...tailoredCv,
      bullets: [
        { text: 'a', category: 'experience', skills: ['WordPress'] },
        { text: 'b', category: 'experience', skills: ['Wordpress'] },
      ],
    });
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    // Una sola entrada, con la primera grafía que apareció.
    expect(result.cv.keywords).toEqual(['WordPress']);
  });

  it('conserva las keywords del LLM si ningún bullet tiene skills curadas', async () => {
    llm.tailorCv = vi.fn().mockResolvedValue({
      ...tailoredCv,
      bullets: [{ text: 'a', category: 'experience', skills: [] }],
    });
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    const result = await useCase.execute({ profileId: 'p-1', job, lang: 'en', formats: ['pdf'] });

    // Mejor las del LLM que un CV sin sección de habilidades.
    expect(result.cv.keywords).toEqual(['Node.js', 'PostgreSQL']);
  });

  it('genera un CV y una carta por cada formato pedido', async () => {
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

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
    const useCase = new TailorDocuments(profiles, experiences, bullets, llm, documents);

    await expect(
      useCase.execute({ profileId: 'missing', job, lang: 'en', formats: ['pdf'] })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(llm.tailorCv).not.toHaveBeenCalled();
  });
});
