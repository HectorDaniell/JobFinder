/**
 * FIXTURE: un TailoredCv de prueba (lo que produciría el ClaudeAdapter del
 * Sprint 2, ya con category/experienceId resueltos por el guardrail —
 * Sprint 6, Paso 1d). Es la ENTRADA del generador de documentos.
 *
 * Cubre todas las ramas de agrupación a propósito: 2 bullets en el empleo
 * actual, 1 en el empleo pasado, 2 proyectos que comparten contexto (deben
 * caer en el MISMO bloque), 1 proyecto sin contexto (bloque sin título) y 1 de
 * educación. Ninguno de los tres últimos tiene experienceId.
 */

import type { TailoredCv } from '@jobfinder/core';
import { mockExperienceCurrent, mockExperiencePast } from './experiences.mock';

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
      category: 'project',
      sourceRole: 'Side project — Open source',
      skills: ['NestJS', 'TypeScript'],
    },
    {
      text: 'Published it to npm, reaching 2k weekly downloads.',
      category: 'project',
      sourceRole: 'Side project — Open source',
      skills: ['npm'],
    },
    {
      text: 'Wrote a technical blog series on database indexing.',
      category: 'project',
      skills: ['PostgreSQL'],
    },
    {
      text: 'Completed a certification in distributed systems design.',
      category: 'education',
      sourceRole: 'Coursera',
      skills: [],
    },
  ],
  keywords: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
};
