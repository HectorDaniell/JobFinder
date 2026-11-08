/**
 * FIXTURE: Mock Jobs (vacantes) para testing
 *
 * Son Job Descriptions REALES o basados en reales.
 * Los usamos para:
 * 1. Testing de tailorCv (qué bullets selecciona para este JD)
 * 2. Testing de cover letter (qué escribe para este JD)
 * 3. Testing del embudo de matching (scoring)
 *
 * IMPORTANCIA: Los JDs deben ser variados:
 * - Diferentes idiomas (EN, ES)
 * - Diferentes roles (Backend, Full Stack, DevOps)
 * - Diferentes seniorities (mid, senior)
 * - Diferentes tamaños de descripción
 */

import { Job } from '@jobfinder/core';

/**
 * SENIOR BACKEND ENGINEER (English) — Match alto con nuestro perfil
 */
export const mockJobSeniorBackendEN: Job = new Job({
  id: 'job-001',
  sourceId: 'source-001',
  externalId: 'job-indeed-001',
  title: 'Senior Backend Engineer',
  company: 'TechCorp Spain',
  location: 'Madrid, Spain',
  modality: 'remote',
  seniority: 'senior',
  description: `We are looking for a Senior Backend Engineer to join our growing platform team.

ABOUT THE ROLE
You will be responsible for designing and maintaining scalable APIs that power our product.
We process millions of requests daily and are committed to low-latency, high-availability systems.

RESPONSIBILITIES
- Design and implement REST APIs using Node.js and TypeScript
- Lead architectural decisions for new services
- Optimize database queries and implement caching strategies
- Mentor junior developers on best practices
- Contribute to our microservices migration project

REQUIREMENTS
- 5+ years of backend development experience
- Strong proficiency in Node.js, TypeScript, and SQL
- Experience with PostgreSQL and database optimization
- Understanding of microservices architecture
- Experience with monitoring and logging systems (ELK, Prometheus)
- Must have led a technical team or mentored developers

NICE TO HAVE
- Experience with Docker and Kubernetes
- AWS or similar cloud platform experience
- Open source contributions
- Speaking at conferences or blogging about tech

COMPENSATION
- €50,000 - €70,000 annual salary
- Flexible working hours
- Professional development budget`,

  url: 'https://example.com/jobs/001',
  postedAt: new Date('2026-06-20'),
  salary: { min: 50000, max: 70000, currency: 'EUR' },
  raw: { source: 'Indeed', crawledAt: '2026-06-20T10:00:00Z' },
  dedupHash: Job.generateDedupHash('TechCorp Spain', 'Senior Backend Engineer', 'Madrid, Spain'),
  ingestedAt: new Date('2026-06-20'),
});

/**
 * FULL STACK ENGINEER (Spanish) — Match medio
 */
export const mockJobFullStackES: Job = new Job({
  id: 'job-002',
  sourceId: 'source-001',
  externalId: 'job-linkedin-002',
  title: 'Ingeniero Full Stack',
  company: 'StartupXYZ',
  location: 'Barcelona, Spain',
  modality: 'hybrid',
  seniority: 'mid',
  description: `¡Únete a nuestro equipo en crecimiento!

Buscamos un Ingeniero Full Stack apasionado por la tecnología que quiera contribuir
a la construcción de una plataforma revolucionaria.

RESPONSABILIDADES
- Desarrollar APIs REST usando NestJS y TypeScript
- Crear interfaces de usuario con React y Next.js
- Optimizar consultas de base de datos
- Colaborar con el equipo de producto en diseño de features
- Escribir tests y mantener alta calidad de código

REQUISITOS
- 3+ años de experiencia en desarrollo
- Experiencia con Node.js, TypeScript y PostgreSQL
- Conocimiento de React o Vue.js
- Familiaridad con Docker
- Excelente comunicación en español e inglés

COMPENSACIÓN
- €38,000 - €50,000 anuales
- Horario flexible
- Trabajo desde casa 2 días a la semana`,

  url: 'https://example.com/jobs/002',
  postedAt: new Date('2026-06-21'),
  salary: { min: 38000, max: 50000, currency: 'EUR' },
  raw: { source: 'LinkedIn', crawledAt: '2026-06-21T14:00:00Z' },
  dedupHash: Job.generateDedupHash('StartupXYZ', 'Ingeniero Full Stack', 'Barcelona, Spain'),
  ingestedAt: new Date('2026-06-21'),
});

/**
 * DEVOPS / INFRASTRUCTURE ENGINEER (English) — Match bajo
 */
export const mockJobDevOpsEN: Job = new Job({
  id: 'job-003',
  sourceId: 'source-001',
  externalId: 'job-greenhouse-003',
  title: 'DevOps / Infrastructure Engineer',
  company: 'CloudSystems Inc',
  location: 'Remote',
  modality: 'remote',
  seniority: 'mid',
  description: `We are seeking an experienced DevOps/Infrastructure Engineer to manage and scale our Kubernetes infrastructure.

ABOUT YOU
- You have deep experience with container orchestration
- You understand infrastructure as code
- You are passionate about automation and reliability

WHAT YOU'LL DO
- Design and maintain Kubernetes clusters
- Implement CI/CD pipelines
- Monitor and optimize system performance
- Respond to incidents and improve runbooks
- Evaluate and implement new tools and technologies

REQUIREMENTS
- 5+ years of DevOps or infrastructure experience
- Expert-level knowledge of Kubernetes
- Proficiency with Docker
- Experience with cloud platforms (AWS, GCP, Azure)
- Strong scripting skills (Python, Bash)
- Experience with monitoring tools (Prometheus, Grafana)

NICE TO HAVE
- Terraform or similar IaC experience
- Helm expertise
- Experience with service mesh (Istio, Linkerd)

COMPENSATION
- €45,000 - €65,000 annual`,

  url: 'https://example.com/jobs/003',
  postedAt: new Date('2026-06-19'),
  salary: { min: 45000, max: 65000, currency: 'EUR' },
  raw: { source: 'Greenhouse', crawledAt: '2026-06-19T08:00:00Z' },
  dedupHash: Job.generateDedupHash(
    'CloudSystems Inc',
    'DevOps / Infrastructure Engineer',
    'Remote'
  ),
  ingestedAt: new Date('2026-06-19'),
});

/**
 * TECH LEAD (Spanish) — Match muy alto
 */
export const mockJobTechLeadES: Job = new Job({
  id: 'job-004',
  sourceId: 'source-001',
  externalId: 'job-custom-004',
  title: 'Tech Lead Backend',
  company: 'MegaCorp Iberia',
  location: 'Remoto',
  modality: 'remote',
  seniority: 'senior',
  description: `Estamos buscando un Tech Lead con amplia experiencia en arquitectura de software.

SOBRE EL PUESTO
Liderarás el equipo de backend en la transformación digital de nuestros sistemas.
Serás responsable de definir estrategia técnica y mentorar a tus colegas.

RESPONSABILIDADES
- Definir la arquitectura y estándares de desarrollo
- Liderar la migración de sistemas legacy a microservicios
- Mentorizar al equipo de 8 desarrolladores
- Tomar decisiones técnicas críticas
- Colaborar con product managers en roadmap
- Presentar en tech talks internos

REQUISITOS
- 8+ años de experiencia en desarrollo backend
- 3+ años en rol de liderazgo técnico
- Dominio de Node.js, TypeScript y PostgreSQL
- Experiencia comprobada en arquitectura de microservicios
- Fuerte entendimiento de patrones de diseño
- Experiencia con ELK, Prometheus o similar

DESEABLE
- Experiencia mentorizando equipos
- Contribuciones a open source
- Certificaciones relevantes

COMPENSACIÓN
- €70,000 - €100,000 anuales
- Bonos por performance
- Presupuesto ilimitado de formación`,

  url: 'https://example.com/jobs/004',
  postedAt: new Date('2026-06-18'),
  salary: { min: 70000, max: 100000, currency: 'EUR' },
  raw: { source: 'Custom', crawledAt: '2026-06-18T12:00:00Z' },
  dedupHash: Job.generateDedupHash('MegaCorp Iberia', 'Tech Lead Backend', 'Remoto'),
  ingestedAt: new Date('2026-06-18'),
});

/**
 * ============ SUBSETS PARA TESTING ============
 */

/** Jobs en inglés */
export const mockJobsEnglish = [mockJobSeniorBackendEN, mockJobDevOpsEN];

/** Jobs en español */
export const mockJobsSpanish = [mockJobFullStackES, mockJobTechLeadES];

/** Jobs senior (match alto con perfil) */
export const mockJobsSenior = [mockJobSeniorBackendEN, mockJobTechLeadES];

/** Jobs mid-level */
export const mockJobsMid = [mockJobFullStackES, mockJobDevOpsEN];
