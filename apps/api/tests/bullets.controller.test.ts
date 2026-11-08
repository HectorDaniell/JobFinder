import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Bullet, Experience, NotFoundError, type Profile } from '@jobfinder/core';
import type { BulletRepository, ProfileRepository, ExperienceRepository } from '@jobfinder/db';
import { BulletsController } from '../src/bullets/bullets.controller';
import type { CreateBulletDto } from '../src/bullets/bullet.schema';

/**
 * Tests unitarios del BulletsController: mockeamos los tres repos (Bullet,
 * Profile, Experience) y verificamos la lógica, incluida la VERIFICACIÓN DE
 * PERTENENCIA — de un bullet de otro perfil (-> 404) y del contenedor que
 * enlaza (-> 404 si es de otro perfil, ver assertExperienceOwned). No
 * arrancamos NestJS ni tocamos la BD.
 */

// ---- fixtures ----
const createDto: CreateBulletDto = {
  experienceId: 'exp-1',
  textEs: 'Lideré la migración',
  textEn: 'Led the migration',
  skills: ['Node.js', 'PostgreSQL'],
  category: 'achievement',
};

const existingBullet = new Bullet({
  id: 'b-1',
  profileId: 'p-1',
  experienceId: 'exp-1',
  textEs: 'Lideré la migración',
  textEn: 'Led the migration',
  skills: ['Node.js'],
  category: 'achievement',
  createdAt: new Date('2026-07-01'),
  updatedAt: new Date('2026-07-01'),
});

const experienceStub = new Experience({
  id: 'exp-1',
  profileId: 'p-1',
  kind: 'job',
  organization: 'Acme',
  title: 'Backend Developer',
  startDate: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
});

// Solo se comprueba que sea truthy (el controller hace `if (!profile)`).
const profileStub = { id: 'p-1' } as unknown as Profile;

// ---- dobles de los repositorios ----
let bullets: BulletRepository;
let profiles: ProfileRepository;
let experiences: ExperienceRepository;

beforeEach(() => {
  bullets = {
    create: vi.fn(),
    findById: vi.fn(),
    findByProfileId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByProfileId: vi.fn(),
  } as unknown as BulletRepository;
  profiles = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updatePreferences: vi.fn(),
    delete: vi.fn(),
  } as unknown as ProfileRepository;
  // Por defecto resuelve al contenedor del perfil 'p-1': la mayoría de tests
  // crea/edita bullets de ESE perfil y no necesita reconfigurar esto. Solo el
  // test de "contenedor ajeno" lo sobreescribe.
  experiences = {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(experienceStub),
    findByProfileId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as ExperienceRepository;
});

describe('BulletsController', () => {
  describe('create', () => {
    it('crea el bullet (id generado, profileId de la URL) si el perfil y el contenedor existen', async () => {
      profiles.findById = vi.fn().mockResolvedValue(profileStub);
      bullets.create = vi.fn().mockImplementation((b: Bullet) => Promise.resolve(b));
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.create('p-1', createDto);

      expect(profiles.findById).toHaveBeenCalledWith('p-1');
      expect(experiences.findById).toHaveBeenCalledWith('exp-1');
      expect(bullets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          profileId: 'p-1',
          experienceId: 'exp-1',
          textEs: 'Lideré la migración',
        })
      );
      expect(result.profileId).toBe('p-1');
    });

    it('lanza NotFoundError y no crea si el perfil no existe', async () => {
      profiles.findById = vi.fn().mockResolvedValue(null);
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(controller.create('nope', createDto)).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(bullets.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundError y no crea si el contenedor es de OTRO perfil', async () => {
      profiles.findById = vi.fn().mockResolvedValue(profileStub);
      experiences.findById = vi.fn().mockResolvedValue(
        new Experience({ ...experienceStub, profileId: 'otro-perfil' })
      );
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(controller.create('p-1', createDto)).rejects.toBeInstanceOf(NotFoundError);
      expect(bullets.create).not.toHaveBeenCalled();
    });
  });

  describe('findByProfile', () => {
    it('devuelve los bullets del perfil', async () => {
      bullets.findByProfileId = vi.fn().mockResolvedValue([existingBullet]);
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.findByProfile('p-1');

      expect(bullets.findByProfileId).toHaveBeenCalledWith('p-1');
      expect(result).toEqual([existingBullet]);
    });
  });

  describe('findOne', () => {
    it('devuelve el bullet si pertenece al perfil', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet);
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.findOne('p-1', 'b-1');

      expect(result).toBe(existingBullet);
    });

    it('lanza NotFoundError si el bullet no existe', async () => {
      bullets.findById = vi.fn().mockResolvedValue(null);
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(controller.findOne('p-1', 'nope')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('lanza NotFoundError si el bullet pertenece a OTRO perfil', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet); // profileId: 'p-1'
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(controller.findOne('otro-perfil', 'b-1')).rejects.toBeInstanceOf(
        NotFoundError
      );
    });
  });

  describe('update', () => {
    it('hace merge (preserva lo no enviado) y actualiza si pertenece', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet);
      bullets.update = vi.fn().mockImplementation((b: Bullet) => Promise.resolve(b));
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.update('p-1', 'b-1', { textEs: 'Nuevo texto' });

      // experienceId no vino en el PATCH: no se revalida contra Experience.
      expect(experiences.findById).not.toHaveBeenCalled();
      expect(bullets.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'b-1',
          profileId: 'p-1',
          experienceId: 'exp-1', // preservado del bullet existente
          textEs: 'Nuevo texto', // sobreescrito
          textEn: 'Led the migration', // preservado
        })
      );
      expect(result.textEs).toBe('Nuevo texto');
    });

    it('re-enlaza a otro contenedor si el PATCH trae experienceId, verificando pertenencia', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet);
      bullets.update = vi.fn().mockImplementation((b: Bullet) => Promise.resolve(b));
      experiences.findById = vi.fn().mockResolvedValue(
        new Experience({ ...experienceStub, id: 'exp-2' })
      );
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.update('p-1', 'b-1', { experienceId: 'exp-2' });

      expect(experiences.findById).toHaveBeenCalledWith('exp-2');
      expect(result.experienceId).toBe('exp-2');
    });

    it('lanza NotFoundError y no actualiza si no pertenece', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet); // p-1
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(
        controller.update('otro-perfil', 'b-1', { textEs: 'x' })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(bullets.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('borra si pertenece (204, sin cuerpo)', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet);
      bullets.delete = vi.fn().mockResolvedValue(undefined);
      const controller = new BulletsController(bullets, profiles, experiences);

      const result = await controller.remove('p-1', 'b-1');

      expect(bullets.delete).toHaveBeenCalledWith('b-1');
      expect(result).toBeUndefined();
    });

    it('lanza NotFoundError y no borra si no pertenece', async () => {
      bullets.findById = vi.fn().mockResolvedValue(existingBullet); // p-1
      const controller = new BulletsController(bullets, profiles, experiences);

      await expect(controller.remove('otro-perfil', 'b-1')).rejects.toBeInstanceOf(
        NotFoundError
      );
      expect(bullets.delete).not.toHaveBeenCalled();
    });
  });
});
