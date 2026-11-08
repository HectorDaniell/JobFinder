import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profile, ConflictError, NotFoundError, type Preferences } from '@jobfinder/core';
import type { ProfileRepository } from '@jobfinder/db';
import { ProfilesController } from '../src/profiles/profiles.controller';
import type { CreateProfileDto } from '../src/profiles/profile.schemas';

/**
 * Tests unitarios del ProfilesController: mockeamos ProfileRepository con
 * vi.fn() y verificamos la lógica del controlador (qué llama al repo, qué
 * errores de dominio lanza). No arrancamos NestJS ni tocamos la BD real.
 */

// ---- fixtures ----
const preferences: Preferences = {
  targetRoles: ['Backend'],
  minSeniority: 'mid',
  preferredLocations: ['Remote'],
  modality: 'remote',
  languages: ['es', 'en'],
  dealBreakers: [],
};

const createDto: CreateProfileDto = {
  fullName: 'Ana Dev',
  email: 'ana@example.com',
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  preferences,
};

const existingProfile = new Profile({
  id: 'p-1',
  fullName: 'Ana Dev',
  email: 'ana@example.com',
  links: {},
  summaryEs: 'Resumen',
  summaryEn: 'Summary',
  preferences,
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

// ---- doble del repositorio ----
let repo: ProfileRepository;

beforeEach(() => {
  repo = {
    create: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    updatePreferences: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProfileRepository;
});

describe('ProfilesController', () => {
  describe('create', () => {
    it('crea el perfil (con id generado) cuando el email no existe', async () => {
      repo.findByEmail = vi.fn().mockResolvedValue(null);
      repo.create = vi.fn().mockImplementation((p: Profile) => Promise.resolve(p));
      const controller = new ProfilesController(repo);

      const result = await controller.create(createDto);

      expect(repo.findByEmail).toHaveBeenCalledWith('ana@example.com');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String), email: 'ana@example.com' })
      );
      expect(result.fullName).toBe('Ana Dev');
    });

    it('lanza ConflictError y no crea si el email ya existe', async () => {
      repo.findByEmail = vi.fn().mockResolvedValue(existingProfile);
      const controller = new ProfilesController(repo);

      await expect(controller.create(createDto)).rejects.toBeInstanceOf(ConflictError);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('devuelve el perfil si existe', async () => {
      repo.findById = vi.fn().mockResolvedValue(existingProfile);
      const controller = new ProfilesController(repo);

      const result = await controller.findOne('p-1');

      expect(result).toBe(existingProfile);
    });

    it('lanza NotFoundError si no existe', async () => {
      repo.findById = vi.fn().mockResolvedValue(null);
      const controller = new ProfilesController(repo);

      await expect(controller.findOne('nope')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('update', () => {
    it('actualiza preferencias si el perfil existe', async () => {
      repo.findById = vi.fn().mockResolvedValue(existingProfile);
      repo.updatePreferences = vi.fn().mockResolvedValue(existingProfile);
      const controller = new ProfilesController(repo);

      await controller.update('p-1', { preferences });

      expect(repo.updatePreferences).toHaveBeenCalledWith('p-1', preferences);
    });

    it('lanza NotFoundError y no actualiza si no existe', async () => {
      repo.findById = vi.fn().mockResolvedValue(null);
      const controller = new ProfilesController(repo);

      await expect(controller.update('nope', { preferences })).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(repo.updatePreferences).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('borra el perfil y no devuelve cuerpo (204)', async () => {
      repo.delete = vi.fn().mockResolvedValue(undefined);
      const controller = new ProfilesController(repo);

      const result = await controller.remove('p-1');

      expect(repo.delete).toHaveBeenCalledWith('p-1');
      expect(result).toBeUndefined();
    });
  });
});
