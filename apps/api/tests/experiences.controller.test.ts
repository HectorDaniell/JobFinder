import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Experience, NotFoundError, ValidationError, type Profile } from '@jobfinder/core';
import type { ExperienceRepository, ProfileRepository } from '@jobfinder/db';
import { ExperiencesController } from '../src/experiences/experiences.controller';
import type { CreateExperienceDto } from '../src/experiences/experience.schemas';

/**
 * Tests unitarios del ExperiencesController: mockeamos ambos repos (Experience
 * y Profile) y verificamos la lógica del controlador — incluida la
 * verificación de PERTENENCIA y que `kind` sea inmutable tras crear (ver
 * ADR-0028). No arrancamos NestJS ni tocamos la BD.
 */

// ---- fixtures ----
const createDto: CreateExperienceDto = {
  kind: 'job',
  organization: 'Fluyez',
  title: 'Fullstack Developer',
  startDate: new Date('2025-04-01T00:00:00.000Z'),
};

const existingExperience = new Experience({
  id: 'exp-1',
  profileId: 'p-1',
  kind: 'job',
  organization: 'Fluyez',
  title: 'Fullstack Developer',
  startDate: new Date('2025-04-01T00:00:00.000Z'),
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

// Solo se comprueba que sea truthy (el controller hace `if (!profile)`).
const profileStub = { id: 'p-1' } as unknown as Profile;

// ---- dobles de los repositorios ----
let experiences: ExperienceRepository;
let profiles: ProfileRepository;

beforeEach(() => {
  experiences = {
    create: vi.fn(),
    findById: vi.fn(),
    findByProfileId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as ExperienceRepository;
  profiles = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updatePreferences: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProfileRepository;
});

describe('ExperiencesController', () => {
  describe('create', () => {
    it('crea el contenedor (id generado, profileId de la URL) si el perfil existe', async () => {
      profiles.findById = vi.fn().mockResolvedValue(profileStub);
      experiences.create = vi.fn().mockImplementation((e: Experience) => Promise.resolve(e));
      const controller = new ExperiencesController(experiences, profiles);

      const result = await controller.create('p-1', createDto);

      expect(profiles.findById).toHaveBeenCalledWith('p-1');
      expect(experiences.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          profileId: 'p-1',
          kind: 'job',
          organization: 'Fluyez',
        })
      );
      expect(result.profileId).toBe('p-1');
    });

    it('lanza NotFoundError y no crea si el perfil no existe', async () => {
      profiles.findById = vi.fn().mockResolvedValue(null);
      const controller = new ExperiencesController(experiences, profiles);

      await expect(controller.create('nope', createDto)).rejects.toBeInstanceOf(NotFoundError);
      expect(experiences.create).not.toHaveBeenCalled();
    });
  });

  describe('findByProfile', () => {
    it('devuelve los contenedores del perfil', async () => {
      experiences.findByProfileId = vi.fn().mockResolvedValue([existingExperience]);
      const controller = new ExperiencesController(experiences, profiles);

      const result = await controller.findByProfile('p-1');

      expect(experiences.findByProfileId).toHaveBeenCalledWith('p-1');
      expect(result).toEqual([existingExperience]);
    });
  });

  describe('findOne', () => {
    it('devuelve el contenedor si pertenece al perfil', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience);
      const controller = new ExperiencesController(experiences, profiles);

      const result = await controller.findOne('p-1', 'exp-1');

      expect(result).toBe(existingExperience);
    });

    it('lanza NotFoundError si no existe', async () => {
      experiences.findById = vi.fn().mockResolvedValue(null);
      const controller = new ExperiencesController(experiences, profiles);

      await expect(controller.findOne('p-1', 'nope')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanza NotFoundError si pertenece a OTRO perfil', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience); // profileId: 'p-1'
      const controller = new ExperiencesController(experiences, profiles);

      await expect(controller.findOne('otro-perfil', 'exp-1')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe('update', () => {
    it('hace merge (preserva lo no enviado) y actualiza si pertenece', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience);
      experiences.update = vi.fn().mockImplementation((e: Experience) => Promise.resolve(e));
      const controller = new ExperiencesController(experiences, profiles);

      const result = await controller.update('p-1', 'exp-1', { title: 'Tech Lead' });

      expect(experiences.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'exp-1',
          profileId: 'p-1',
          kind: 'job', // preservado: no viene en UpdateExperienceDto, es inmutable
          title: 'Tech Lead', // sobreescrito
          organization: 'Fluyez', // preservado
        })
      );
      expect(result.title).toBe('Tech Lead');
    });

    it('null en endDate lo LIMPIA (vuelve a ser el actual)', async () => {
      const withEndDate = new Experience({ ...existingExperience, endDate: new Date('2026-01-01') });
      experiences.findById = vi.fn().mockResolvedValue(withEndDate);
      experiences.update = vi.fn().mockImplementation((e: Experience) => Promise.resolve(e));
      const controller = new ExperiencesController(experiences, profiles);

      await controller.update('p-1', 'exp-1', { endDate: null });

      expect(experiences.update).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: undefined })
      );
    });

    it('rechaza si la fecha de fin (nueva o existente) queda antes que el inicio', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience); // startDate 2025-04
      const controller = new ExperiencesController(experiences, profiles);

      await expect(
        controller.update('p-1', 'exp-1', { endDate: new Date('2025-01-01') })
      ).rejects.toBeInstanceOf(ValidationError);
      expect(experiences.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundError y no actualiza si no pertenece', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience); // p-1
      const controller = new ExperiencesController(experiences, profiles);

      await expect(
        controller.update('otro-perfil', 'exp-1', { title: 'x' })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(experiences.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('borra si pertenece (204, sin cuerpo)', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience);
      experiences.delete = vi.fn().mockResolvedValue(undefined);
      const controller = new ExperiencesController(experiences, profiles);

      const result = await controller.remove('p-1', 'exp-1');

      expect(experiences.delete).toHaveBeenCalledWith('exp-1');
      expect(result).toBeUndefined();
    });

    it('lanza NotFoundError y no borra si no pertenece', async () => {
      experiences.findById = vi.fn().mockResolvedValue(existingExperience); // p-1
      const controller = new ExperiencesController(experiences, profiles);

      await expect(controller.remove('otro-perfil', 'exp-1')).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(experiences.delete).not.toHaveBeenCalled();
    });
  });
});
