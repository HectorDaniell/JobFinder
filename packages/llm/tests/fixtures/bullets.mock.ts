/**
 * FIXTURE: Mock Bullets para testing
 *
 * Estos son bullets REALES del perfil de Daniel Developer.
 * Los usamos para:
 * 1. Testing de tailorCv (selecciona de estos bullets)
 * 2. Testing de guardrails (valida que no invente bullets)
 * 3. Testing de anti-invención (verifica origen)
 *
 * ESTRUCTURA DE UN BULLET:
 * - textEs / textEn: Descripción en dos idiomas
 * - skills: Array de skills mencionados
 * - category: experience | achievement (ver Bullet.ts — ya no distingue
 *   proyecto/educación, eso lo hace el `kind` del contenedor)
 * - experienceId: el contenedor al que pertenece (obligatorio)
 * - metrics: Datos cuantitativos opcionales
 *
 * Los ids de experienceId agrupan por el mismo criterio que antes expresaba
 * `sourceRole` como texto libre: bullet-002/004/006 comparten "Tech Lead".
 */

import { Bullet } from '@jobfinder/core';

export const mockBullets: Bullet[] = [
  new Bullet({
    id: 'bullet-001',
    profileId: 'test-profile-001',
    textEs:
      'Diseñé y mantuve una API REST escalable en NestJS que maneja ' +
      '10k requests por segundo con latencia < 100ms',
    textEn:
      'Designed and maintained a scalable REST API in NestJS handling ' +
      '10k RPS with latency < 100ms',
    skills: ['NestJS', 'TypeScript', 'REST API', 'Performance', 'Node.js'],
    category: 'experience',
    experienceId: 'exp-senior-backend',
    metrics: {
      yearsExperience: 5,
      teamSize: 4,
      projectsDelivered: 8,
    },
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-06-24'),
  }),

  new Bullet({
    id: 'bullet-002',
    profileId: 'test-profile-001',
    textEs:
      'Implementé un sistema de logging y monitoreo con ELK Stack, ' +
      'reduciendo el MTTR en 70%',
    textEn:
      'Implemented logging and monitoring system with ELK Stack, ' +
      'reducing MTTR by 70%',
    skills: ['Elasticsearch', 'Logging', 'Monitoring', 'DevOps', 'ELK'],
    category: 'achievement',
    experienceId: 'exp-tech-lead',
    metrics: {
      yearsExperience: 5,
      teamSize: 8,
      projectsDelivered: 3,
    },
    createdAt: new Date('2026-02-10'),
    updatedAt: new Date('2026-06-24'),
  }),

  new Bullet({
    id: 'bullet-003',
    profileId: 'test-profile-001',
    textEs:
      'Migré una base de datos de 200GB desde MySQL a PostgreSQL sin downtime ' +
      'utilizando replicación lógica',
    textEn:
      'Migrated 200GB database from MySQL to PostgreSQL with zero downtime ' +
      'using logical replication',
    skills: ['PostgreSQL', 'MySQL', 'Database Migration', 'High Availability'],
    category: 'achievement',
    experienceId: 'exp-dba',
    metrics: {
      yearsExperience: 4,
      teamSize: 2,
      projectsDelivered: 1,
    },
    createdAt: new Date('2026-03-05'),
    updatedAt: new Date('2026-06-24'),
  }),

  new Bullet({
    id: 'bullet-004',
    profileId: 'test-profile-001',
    textEs:
      'Mentoricé a 3 desarrolladores junior en buenas prácticas de arquitectura limpia ' +
      'y testing automatizado',
    textEn:
      'Mentored 3 junior developers in clean architecture and automated testing best practices',
    skills: ['Mentoring', 'Clean Architecture', 'Testing', 'Leadership'],
    category: 'experience',
    experienceId: 'exp-tech-lead',
    metrics: {
      yearsExperience: 5,
      teamSize: 3,
      projectsDelivered: 12,
    },
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-06-24'),
  }),

  new Bullet({
    id: 'bullet-005',
    profileId: 'test-profile-001',
    textEs:
      'Certificado en TypeScript Advanced Types y arquitectura de microservicios por Coursera',
    textEn:
      'Certified in TypeScript Advanced Types and microservices architecture by Coursera',
    skills: ['TypeScript', 'Microservices', 'Architecture'],
    category: 'achievement',
    experienceId: 'exp-education',
    metrics: {
      yearsExperience: 5,
      teamSize: 0,
      projectsDelivered: 0,
    },
    createdAt: new Date('2026-05-15'),
    updatedAt: new Date('2026-06-24'),
  }),

  new Bullet({
    id: 'bullet-006',
    profileId: 'test-profile-001',
    textEs:
      'Lideré la refactorización de un monolito de 2M líneas a arquitectura de microservicios, ' +
      'reduciendo deployment time en 60%',
    textEn:
      'Led refactoring of a 2M line monolith to microservices architecture, ' +
      'reducing deployment time by 60%',
    skills: ['Microservices', 'Refactoring', 'Architecture', 'Node.js'],
    category: 'achievement',
    experienceId: 'exp-tech-lead',
    metrics: {
      yearsExperience: 4,
      teamSize: 6,
      projectsDelivered: 1,
    },
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-24'),
  }),
];

/**
 * ============ SUBSETS PARA TESTING ============
 * Subconjuntos de bullets para casos específicos de test
 */

/** Bullets con muchos skills (tecnológicos) */
export const mockBulletsBackend = mockBullets.filter((b) =>
  ['NestJS', 'REST API', 'PostgreSQL', 'Microservices'].some((s) =>
    b.skills.includes(s)
  )
);

/** Bullets del contenedor "Tech Lead" (antes agrupados por sourceRole de texto libre) */
export const mockBulletsLeadership = mockBullets.filter((b) => b.experienceId === 'exp-tech-lead');

/** Un solo bullet (para testing con datos mínimos) */
export const mockSingleBullet = [mockBullets[0]];
