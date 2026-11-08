/**
 * FIXTURE: un TailoredCv de prueba (lo que produciría el ClaudeAdapter, ya con
 * category/experienceId resueltos por el guardrail — ADR-0023 — y compuesto
 * por TailorDocuments — ADR-0026/0028). Es la ENTRADA del generador de
 * documentos.
 *
 * Cubre las 3 secciones a propósito: 2 bullets en el empleo actual, 1 en el
 * pasado, 2 en el proyecto (para probar que varios bullets bajo un mismo
 * contenedor se agrupan igual que en un empleo) y 1 en educación. TODOS tienen
 * experienceId: ya no existe el bullet "suelto" (ver ADR-0028).
 */

import type { TailoredCv } from '@jobfinder/core';
import { mockExperienceCurrent, mockExperiencePast, mockProject, mockEducation } from './experiences.mock';

export const mockTailoredCv: TailoredCv = {
  content: '# CV\n\nSoftware Engineer',
  bullets: [
    {
      text: 'Led migration to a microservices architecture, cutting latency by 40%.',
      category: 'achievement',
      experienceId: mockExperienceCurrent.id,
      skills: ['Microservices', 'Node.js'],
    },
    {
      text: 'Built a CI/CD pipeline that reduced deploy time from 30 to 5 minutes.',
      category: 'experience',
      experienceId: mockExperienceCurrent.id,
      skills: ['CI/CD', 'Docker'],
    },
    {
      text: 'Designed the initial REST API architecture from scratch.',
      category: 'experience',
      experienceId: mockExperiencePast.id,
      skills: ['REST API', 'Node.js'],
    },
    {
      text: 'Built an open-source CLI tool for scaffolding NestJS projects.',
      category: 'achievement',
      experienceId: mockProject.id,
      skills: ['NestJS', 'TypeScript'],
    },
    {
      text: 'Published it to npm, reaching 2k weekly downloads.',
      category: 'achievement',
      experienceId: mockProject.id,
      skills: ['npm'],
    },
    {
      text: 'Completed a certification in distributed systems design.',
      category: 'achievement',
      experienceId: mockEducation.id,
      skills: [],
    },
  ],
  keywords: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
};
