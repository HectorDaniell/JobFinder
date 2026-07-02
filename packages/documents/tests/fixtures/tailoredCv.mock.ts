/**
 * FIXTURE: un TailoredCv de prueba (lo que produciría el ClaudeAdapter del
 * Sprint 2). Es la ENTRADA del generador de documentos.
 */

import type { TailoredCv } from '@jobfinder/core';

export const mockTailoredCv: TailoredCv = {
  content: '# CV\n\nSoftware Engineer',
  bullets: [
    'Led migration to a microservices architecture, cutting latency by 40%.',
    'Built a CI/CD pipeline that reduced deploy time from 30 to 5 minutes.',
    'Mentored 3 junior developers and introduced code review standards.',
  ],
  keywords: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
};
