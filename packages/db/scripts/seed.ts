import 'dotenv/config';
import { randomUUID } from 'crypto';
import {
  db,
  ProfileRepository,
  BulletRepository,
  ExperienceRepository,
  JobRepository,
  source,
} from '../src/index';
import { Profile, Bullet, Experience, Job } from '../../core/src/index';

async function seed() {
  console.log('🌱 Sembrando datos de prueba...\n');

  try {
    /* Crear perfil de usuario test */
    const profileId = randomUUID();
    const profile = new Profile({
      id: profileId,
      fullName: 'Daniel Developer',
      email: 'dani.dev@example.com',
      phone: '+51 123456789',
      links: {
        github: 'https://github.com/juandev',
        linkedin: 'https://linkedin.com/in/juandev',
        portfolio: 'https://danidev.com',
      },
      summaryEs:
        'Ingeniero de software con 5 años de experiencia en desarrollo backend con NestJS, TypeScript y PostgreSQL. Apasionado por arquitectura limpia y testing.',
      summaryEn:
        'Software engineer with 5 years of backend development experience using NestJS, TypeScript, and PostgreSQL. Passionate about clean architecture and testing.',
      preferences: {
        targetRoles: ['Backend Developer', 'Full Stack Engineer', 'Technical Lead'],
        minSeniority: 'mid',
        preferredLocations: ['Spain', 'Remote'],
        modality: 'remote',
        languages: ['es', 'en'],
        minSalary: 45000,
        dealBreakers: ['Startup with no funding', 'No remote option'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profileRepo = new ProfileRepository(db);
    const savedProfile = await profileRepo.create(profile);
    console.log(`✅ Perfil creado: ${savedProfile.fullName} (ID: ${savedProfile.id})`);

    /* Crear los contenedores: 2 empleos + 1 educación. Todo bullet pertenece a
       uno de estos — ya no hay bullets "sueltos" (ver ADR-0028). */
    const experienceRepo = new ExperienceRepository(db);

    const jobA = await experienceRepo.create(
      new Experience({
        id: randomUUID(),
        profileId: savedProfile.id,
        kind: 'job',
        organization: 'TechCorp Spain',
        title: 'Senior Backend Developer',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2024-12-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    const jobB = await experienceRepo.create(
      new Experience({
        id: randomUUID(),
        profileId: savedProfile.id,
        kind: 'job',
        organization: 'CloudSystems Inc',
        title: 'Tech Lead',
        startDate: new Date('2025-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    const education = await experienceRepo.create(
      new Experience({
        id: randomUUID(),
        profileId: savedProfile.id,
        kind: 'education',
        organization: 'Coursera',
        title: 'TypeScript Advanced Types y arquitectura de microservicios',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    console.log(`✅ 3 contenedores creados (2 empleos + 1 educación)\n`);

    /* Crear bullets de experiencia, cada uno enlazado a su contenedor */
    const bullets = [
      {
        experienceId: jobA.id,
        textEs:
          'Diseñé y desarrollé una API REST escalable en NestJS que maneja 10k RPS con latencia < 100ms',
        textEn:
          'Designed and developed a scalable REST API in NestJS handling 10k RPS with latency < 100ms',
        skills: ['NestJS', 'TypeScript', 'PostgreSQL', 'Docker', 'Performance'],
        category: 'experience' as const,
      },
      {
        experienceId: jobB.id,
        textEs:
          'Implementé un sistema de logging y monitoreo con ELK Stack reduciendo MTTR en 70%',
        textEn:
          'Implemented logging and monitoring system with ELK Stack reducing MTTR by 70%',
        skills: ['Elasticsearch', 'Logging', 'Monitoring', 'DevOps'],
        category: 'achievement' as const,
      },
      {
        experienceId: jobA.id,
        textEs:
          'Migré base de datos de 200GB desde MySQL a PostgreSQL sin downtime usando replicación lógica',
        textEn:
          'Migrated 200GB database from MySQL to PostgreSQL with zero downtime using logical replication',
        skills: ['PostgreSQL', 'MySQL', 'Database Migration', 'High Availability'],
        category: 'achievement' as const,
      },
      {
        experienceId: jobB.id,
        textEs:
          'Mentoricé 3 desarrolladores junior en buenas prácticas de arquitectura limpia y testing',
        textEn:
          'Mentored 3 junior developers in clean architecture and testing best practices',
        skills: ['Mentoring', 'Clean Architecture', 'Testing'],
        category: 'experience' as const,
      },
      {
        experienceId: education.id,
        textEs:
          'Certificado en TypeScript Advanced Types y arquitectura de microservicios por Coursera',
        textEn:
          'Certified in TypeScript Advanced Types and microservices architecture by Coursera',
        skills: ['TypeScript', 'Microservices', 'Architecture'],
        category: 'achievement' as const,
      },
    ];

    const bulletRepo = new BulletRepository(db);
    for (const bulletData of bullets) {
      const bullet = new Bullet({
        id: randomUUID(),
        profileId: savedProfile.id,
        experienceId: bulletData.experienceId,
        textEs: bulletData.textEs,
        textEn: bulletData.textEn,
        skills: bulletData.skills,
        category: bulletData.category,
        metrics: {
          yearsExperience: 5,
          teamSize: 8,
          projectsDelivered: 12,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await bulletRepo.create(bullet);
    }
    console.log(`✅ ${bullets.length} bullets creados\n`);

    /* Crear source de prueba */
    const sourceId = randomUUID();
    await db.insert(source).values({
      id: sourceId,
      name: 'test-source-linkedin',
      kind: 'api',
      enabled: 'true',
    });
    console.log(`✅ Source creado (ID: ${sourceId})\n`);

    /* Crear jobs de prueba */
    const jobs = [
      {
        externalId: 'job-001',
        title: 'Senior Backend Engineer',
        company: 'TechCorp Spain',
        location: 'Madrid, Spain',
        modality: 'remote' as const,
        seniority: 'senior' as const,
        description:
          'We are looking for a Senior Backend Engineer to join our team. You will be working with NestJS, TypeScript, and PostgreSQL. Responsibilities include designing scalable APIs, mentoring junior developers, and contributing to architectural decisions.',
        url: 'https://example.com/jobs/001',
        postedAt: new Date('2026-06-20'),
        salary: { min: 50000, max: 70000, currency: 'EUR' },
      },
      {
        externalId: 'job-002',
        title: 'Full Stack Engineer',
        company: 'StartupXYZ',
        location: 'Barcelona, Spain',
        modality: 'hybrid' as const,
        seniority: 'mid' as const,
        description:
          'Join our growing team! We use NestJS for backend and React for frontend. Experience with TypeScript, PostgreSQL, and Docker is required.',
        url: 'https://example.com/jobs/002',
        postedAt: new Date('2026-06-21'),
        salary: { min: 38000, max: 50000, currency: 'EUR' },
      },
      {
        externalId: 'job-003',
        title: 'DevOps / Infrastructure Engineer',
        company: 'CloudSystems Inc',
        location: 'Remote',
        modality: 'remote' as const,
        seniority: 'mid' as const,
        description:
          'We need an experienced DevOps engineer to manage our Kubernetes infrastructure. Knowledge of Docker, CI/CD pipelines, and monitoring tools is essential.',
        url: 'https://example.com/jobs/003',
        postedAt: new Date('2026-06-19'),
        salary: { min: 45000, max: 65000, currency: 'EUR' },
      },
    ];

    const jobRepo = new JobRepository(db);
    for (const jobData of jobs) {
      const job = new Job({
        id: randomUUID(),
        sourceId,
        externalId: jobData.externalId,
        title: jobData.title,
        company: jobData.company,
        location: jobData.location,
        modality: jobData.modality,
        seniority: jobData.seniority,
        description: jobData.description,
        url: jobData.url,
        postedAt: jobData.postedAt,
        salary: jobData.salary,
        raw: { crawledAt: new Date().toISOString() },
        dedupHash: Job.generateDedupHash(jobData.company, jobData.title, jobData.location || 'remote'),
        ingestedAt: new Date(),
      });

      await jobRepo.create(job);
    }
    console.log(`✅ ${jobs.length} jobs creados\n`);

    console.log('═══════════════════════════════════════════════');
    console.log('🌱 SEED COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════');
    console.log(`
Datos creados:
  • 1 Perfil: ${savedProfile.fullName} (${savedProfile.email})
  • 5 Bullets (logros/experiencia)
  • 3 Jobs (ofertas de empleo)

Próximos pasos:
  1. Verifica en la BD: SELECT * FROM profile;
  2. O usa DBeaver/TablePlus para explorar visualmente
  3. En Sprint 1b, escribirás tests para validar repositories
    `);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante seed:', error);
    process.exit(1);
  }
}

seed();
