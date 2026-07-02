/**
 * FIXTURE: Profiles de prueba para los tests de documents.
 * Datos consistentes y realistas, centralizados aquí.
 */

import { Profile } from '@jobfinder/core';

export const mockProfile: Profile = new Profile({
  id: 'test-profile-001',
  fullName: 'Daniel Developer',
  email: 'daniel.dev@example.com',
  phone: '+51 987654321',
  links: {
    github: 'https://github.com/danieldev',
    linkedin: 'https://linkedin.com/in/danieldev',
    portfolio: 'https://danieldev.com',
  },
  summaryEs:
    'Ingeniero de software con 5 años de experiencia en desarrollo backend. ' +
    'Especializado en arquitectura limpia, TypeScript, Node.js y PostgreSQL.',
  summaryEn:
    'Software engineer with 5 years of backend development experience. ' +
    'Specialized in clean architecture, TypeScript, Node.js, and PostgreSQL.',
  preferences: {
    targetRoles: ['Backend Developer', 'Full Stack Engineer'],
    minSeniority: 'mid',
    preferredLocations: ['Spain', 'Remote'],
    modality: 'remote',
    languages: ['es', 'en'],
    minSalary: 45000,
    dealBreakers: ['No remote option'],
  },
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-24'),
});

/**
 * Variante con acentos y con SOLO un link (sin teléfono), para probar:
 * - el slugify del filename (José Ramírez Núñez → jose-ramirez-nunez)
 * - la normalización del header (omite los links ausentes y el phone undefined)
 */
export const mockProfileAccents: Profile = new Profile({
  ...mockProfile,
  id: 'test-profile-accents',
  fullName: 'José Ramírez Núñez',
  phone: undefined,
  links: { github: 'https://github.com/jose' },
});
