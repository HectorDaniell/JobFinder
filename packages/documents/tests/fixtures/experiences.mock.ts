/**
 * FIXTURE: Experience de prueba — un contenedor de cada `kind` (Sprint 6, Paso
 * 1d + reestructuración de contenedores). Dos empleos del mismo mockProfile
 * (uno actual sin endDate, uno terminado) para ejercitar el orden de CV
 * (actual primero) y el formato "… – Present"/"… – Actualidad"; un proyecto
 * con URL; una educación.
 */

import { Experience } from '@jobfinder/core';

export const mockExperienceCurrent: Experience = new Experience({
  id: 'exp-001',
  profileId: 'test-profile-001',
  kind: 'job',
  organization: 'Acme Corp',
  title: 'Senior Backend Engineer',
  startDate: new Date('2024-01-01T00:00:00.000Z'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

export const mockExperiencePast: Experience = new Experience({
  id: 'exp-002',
  profileId: 'test-profile-001',
  kind: 'job',
  organization: 'Previous Inc',
  title: 'Backend Developer',
  startDate: new Date('2021-06-01T00:00:00.000Z'),
  endDate: new Date('2023-12-01T00:00:00.000Z'),
  createdAt: new Date('2021-06-01'),
  updatedAt: new Date('2021-06-01'),
});

export const mockProject: Experience = new Experience({
  id: 'exp-003',
  profileId: 'test-profile-001',
  kind: 'project',
  organization: 'Side project',
  title: 'Open source CLI',
  url: 'https://github.com/danieldev/cli',
  startDate: new Date('2023-01-01T00:00:00.000Z'),
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
});

export const mockEducation: Experience = new Experience({
  id: 'exp-004',
  profileId: 'test-profile-001',
  kind: 'education',
  organization: 'Coursera',
  title: 'Distributed systems design certification',
  startDate: new Date('2022-01-01T00:00:00.000Z'),
  endDate: new Date('2022-01-01T00:00:00.000Z'),
  createdAt: new Date('2022-01-01'),
  updatedAt: new Date('2022-01-01'),
});

export const mockExperiences: Experience[] = [
  mockExperienceCurrent,
  mockExperiencePast,
  mockProject,
  mockEducation,
];
