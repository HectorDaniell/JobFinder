import { Module } from '@nestjs/common';
import { db, ProfileRepository, BulletRepository, ExperienceRepository } from '@jobfinder/db';
import { DocumentAdapter } from '@jobfinder/documents';
import { TailorDocuments } from '@jobfinder/core';
import { createLazyLlm } from './lazy-llm';
import { createFakeLlm } from './fake-llm';

/**
 * COMPOSITION ROOT: cablea las clases "planas" de los packages —que no son
 * `@Injectable` de Nest— como providers, para que los controllers las inyecten.
 *
 * Usamos las clases como TOKENS con `useFactory` (no `useClass`) porque las
 * construimos nosotros pasándoles sus dependencias. Cuando una factory necesita
 * otros providers (p. ej. TailorDocuments necesita los repos y el DocumentAdapter),
 * se listan en `inject` y llegan como argumentos.
 *
 * TailorDocuments se arma con un LLM PEREZOSO (createLazyLlm): el ClaudeClient
 * —que exige ANTHROPIC_API_KEY— no se crea al arrancar, sino en la primera
 * llamada a /tailor. Así la API levanta y sirve el CRUD sin la key.
 *
 * Con USE_FAKE_LLM=true se sustituye SOLO el LLM por un doble de desarrollo
 * (fake-llm.ts): el resto del pipeline —perfil, bullets y generación de PDF/DOCX—
 * sigue siendo real. Sirve para trabajar sin créditos de Anthropic; quitar el
 * flag del .env devuelve el comportamiento normal sin tocar código.
 */
@Module({
  providers: [
    { provide: ProfileRepository, useFactory: () => new ProfileRepository(db) },
    { provide: BulletRepository, useFactory: () => new BulletRepository(db) },
    { provide: ExperienceRepository, useFactory: () => new ExperienceRepository(db) },
    { provide: DocumentAdapter, useFactory: () => new DocumentAdapter() },
    {
      provide: TailorDocuments,
      useFactory: (
        profiles: ProfileRepository,
        bullets: BulletRepository,
        documents: DocumentAdapter
      ) =>
        new TailorDocuments(
          profiles,
          process.env.USE_FAKE_LLM === 'true' ? createFakeLlm(bullets) : createLazyLlm(bullets),
          documents
        ),
      inject: [ProfileRepository, BulletRepository, DocumentAdapter],
    },
  ],
  exports: [ProfileRepository, BulletRepository, ExperienceRepository, TailorDocuments],
})
export class InfraModule {}
