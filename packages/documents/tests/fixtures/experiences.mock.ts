/**
 * FIXTURE: Experience de prueba (Paso 1d, Sprint 6). Dos empleos del mismo
 * mockProfile: uno actual (sin endDate) y uno terminado, para ejercitar el
 * orden de CV (actual primero) y el formato "… – Present"/"… – Actualidad".
 */

import { Experience } from '@jobfinder/core';

export const mockExperienceCurrent: Experience = new Experience({
  id: 'exp-001',
  profileId: 'test-profile-001',
  company: 'Acme Corp',
  role: 'Senior Backend Engineer',
  startDate: new Date('2024-01-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

export const mockExperiencePast: Experience = new Experience({
  id: 'exp-002',
  profileId: 'test-profile-001',
  company: 'Previous Inc',
  role: 'Backend Developer',
  startDate: new Date('2021-06-01T00:00:00.000Z'),
  endDate: new Date('2023-12-01T00:00:00.000Z'),
  createdAt: new Date('2021-06-01'),
  updatedAt: new Date('2021-06-01'),
});

export const mockExperiences: Experience[] = [mockExperienceCurrent, mockExperiencePast];
