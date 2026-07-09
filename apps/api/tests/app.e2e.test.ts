import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import {
  TailorDocuments,
  type Profile,
  type Bullet,
  type Preferences,
  type TailorResult,
} from '@jobfinder/core';
import { ProfileRepository, BulletRepository } from '@jobfinder/db';
import { AppModule } from '../src/app.module';

/**
 * Tests e2e: arrancan la app REAL (contenedor de Nest, rutas montadas, pipe +
 * filtro globales) y la ejercitan con app.inject() de Fastify —peticiones
 * simuladas, sin abrir un puerto de red—.
 *
 * Sustituimos las dependencias externas por dobles:
 *   - Repos       -> fakes in-memory (Map): flujos reales sin Postgres.
 *   - TailorDocuments -> fake fijo: "Claude mockeado", sin API key ni red.
 * Así validamos el CABLEADO (DI, rutas, validación, errores), no la persistencia
 * ni el LLM (que ya cubren sus propios tests).
 */

// ---------- fakes in-memory ----------
class FakeProfileRepository {
  private store = new Map<string, Profile>();
  clear() {
    this.store.clear();
  }
  async create(p: Profile) {
    this.store.set(p.id, p);
    return p;
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.store.values()].find((p) => p.email === email) ?? null;
  }
  async updatePreferences(id: string, prefs: Preferences) {
    const p = this.store.get(id);
    if (!p) throw new Error(`Profile ${id} not found`);
    const updated = p.updatePreferences(prefs);
    this.store.set(id, updated);
    return updated;
  }
  async delete(id: string) {
    this.store.delete(id);
  }
}

class FakeBulletRepository {
  private store = new Map<string, Bullet>();
  clear() {
    this.store.clear();
  }
  async create(b: Bullet) {
    this.store.set(b.id, b);
    return b;
  }
  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findByProfileId(profileId: string) {
    return [...this.store.values()].filter((b) => b.profileId === profileId);
  }
  async update(b: Bullet) {
    this.store.set(b.id, b);
    return b;
  }
  async delete(id: string) {
    this.store.delete(id);
  }
  async deleteByProfileId(profileId: string) {
    for (const [id, b] of this.store) if (b.profileId === profileId) this.store.delete(id);
  }
}

const fakeTailorResult: TailorResult = {
  cv: { content: '# CV', bullets: ['Lideré X'], keywords: ['Node.js'] },
  coverLetter: 'Estimado equipo...',
  // bytes [37,80,68,70] = "%PDF" -> base64 "JVBERg=="
  files: [{ filename: 'cv.pdf', mimeType: 'application/pdf', bytes: new Uint8Array([37, 80, 68, 70]) }],
};
const fakeTailor = { execute: async () => fakeTailorResult };

// ---------- payloads ----------
const prefs: Preferences = {
  targetRoles: ['Backend'],
  minSeniority: 'mid',
  preferredLocations: ['Remote'],
  modality: 'remote',
  languages: ['es', 'en'],
  dealBreakers: [],
};
const profilePayload = {
  fullName: 'Ana Dev',
  email: 'ana@example.com',
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  preferences: prefs,
};

// ---------- setup ----------
const fakeProfiles = new FakeProfileRepository();
const fakeBullets = new FakeBulletRepository();
let app: NestFastifyApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ProfileRepository)
    .useValue(fakeProfiles)
    .overrideProvider(BulletRepository)
    .useValue(fakeBullets)
    .overrideProvider(TailorDocuments)
    .useValue(fakeTailor)
    .compile();

  app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  fakeProfiles.clear();
  fakeBullets.clear();
});

/** Crea un perfil vía HTTP y devuelve su id. */
async function createProfile(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/profiles', payload: profilePayload });
  return res.json().id;
}

describe('API (e2e)', () => {
  it('GET /health -> 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('POST /profiles válido -> 201 con id', async () => {
    const res = await app.inject({ method: 'POST', url: '/profiles', payload: profilePayload });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ email: 'ana@example.com' });
    expect(res.json().id).toBeTruthy();
  });

  it('POST /profiles con email inválido -> 400 (ZodValidationPipe)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/profiles',
      payload: { ...profilePayload, email: 'no-es-email' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /profiles con email duplicado -> 409 (DomainExceptionFilter)', async () => {
    await app.inject({ method: 'POST', url: '/profiles', payload: profilePayload });
    const res = await app.inject({ method: 'POST', url: '/profiles', payload: profilePayload });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('CONFLICT');
  });

  it('GET /profiles/:id inexistente -> 404 (DomainExceptionFilter)', async () => {
    const res = await app.inject({ method: 'GET', url: '/profiles/no-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });

  it('bullets anidados: crea (201) y rechaza acceso cruzado (404)', async () => {
    const profileId = await createProfile();

    const bulletRes = await app.inject({
      method: 'POST',
      url: `/profiles/${profileId}/bullets`,
      payload: { textEs: 'Logro', textEn: 'Achievement', skills: ['Node'], category: 'achievement' },
    });
    expect(bulletRes.statusCode).toBe(201);
    const bulletId = bulletRes.json().id;

    // el mismo bullet, pedido a través de OTRO perfil -> 404 (getOwned)
    const cross = await app.inject({
      method: 'GET',
      url: `/profiles/otro-perfil/bullets/${bulletId}`,
    });
    expect(cross.statusCode).toBe(404);
  });

  it('POST /profiles/:id/tailor -> 200 con archivos en base64', async () => {
    const profileId = await createProfile();

    const res = await app.inject({
      method: 'POST',
      url: `/profiles/${profileId}/tailor`,
      payload: {
        job: { title: 'Backend Engineer', company: 'Acme', description: 'Node.js + PostgreSQL' },
        lang: 'es',
        formats: ['pdf'],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.coverLetter).toBe('Estimado equipo...');
    expect(body.files[0]).toMatchObject({ filename: 'cv.pdf', base64: 'JVBERg==' });
  });
});
