/**
 * FIXTURE: Mock Profile para testing
 *
 * Este es un perfil REALISTA que usaremos en todos los tests.
 * Basado en un ingeniero backend real (con datos anonymized).
 *
 * ¿Por qué fixture?
 * Los tests necesitan datos consistentes y realistas.
 * En lugar de crear datos en cada test, los centralizamos aquí.
 *
 * IMPORTANTE: Cuando cambies esto, todos los tests leen el cambio.
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

  // Resúmenes bilingües
  summaryEs:
    'Ingeniero de software con 5 años de experiencia en desarrollo backend. ' +
    'Especializado en arquitectura limpia, TypeScript, Node.js y PostgreSQL. ' +
    'Apasionado por performance y testing.',

  summaryEn:
    'Software engineer with 5 years of backend development experience. ' +
    'Specialized in clean architecture, TypeScript, Node.js, and PostgreSQL. ' +
    'Passionate about performance and testing.',

  // Preferencias duras (usadas en filtrado de matching)
  preferences: {
    targetRoles: ['Backend Developer', 'Full Stack Engineer', 'Tech Lead'],
    minSeniority: 'mid',
    preferredLocations: ['Spain', 'Remote'],
    modality: 'remote',
    languages: ['es', 'en'],
    minSalary: 45000,
    dealBreakers: ['Startup with no funding', 'No remote option'],
  },

  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-24'),
});

/**
 * Variantes de perfil para diferentes casos de test
 */

export const mockProfileJunior: Profile = new Profile({
  ...mockProfile,
  id: 'test-profile-junior',
  fullName: 'Junior Developer',
  summaryEs: '2 años de experiencia como desarrollador backend...',
  summaryEn: '2 years of backend development experience...',
  preferences: {
    ...mockProfile.preferences,
    minSeniority: 'junior',
  },
});

export const mockProfileSenior: Profile = new Profile({
  ...mockProfile,
  id: 'test-profile-senior',
  fullName: 'Senior Developer',
  summaryEs: '10 años de experiencia como Tech Lead y architect...',
  summaryEn: '10 years of experience as Tech Lead and architect...',
  preferences: {
    ...mockProfile.preferences,
    minSeniority: 'senior',
    minSalary: 80000,
  },
});
