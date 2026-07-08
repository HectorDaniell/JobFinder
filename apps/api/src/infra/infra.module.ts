import { Module } from '@nestjs/common';
import { db, ProfileRepository, BulletRepository } from '@jobfinder/db';
import { DocumentAdapter } from '@jobfinder/documents';
import { TailorDocuments } from '@jobfinder/core';
import { createLazyLlm } from './lazy-llm';

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
 */
@Module({
  providers: [
    { provide: ProfileRepository, useFactory: () => new ProfileRepository(db) },
    { provide: BulletRepository, useFactory: () => new BulletRepository(db) },
    { provide: DocumentAdapter, useFactory: () => new DocumentAdapter() },
    {
      provide: TailorDocuments,
      useFactory: (
        profiles: ProfileRepository,
        bullets: BulletRepository,
        documents: DocumentAdapter
      ) => new TailorDocuments(profiles, createLazyLlm(bullets), documents),
      inject: [ProfileRepository, BulletRepository, DocumentAdapter],
    },
  ],
  exports: [ProfileRepository, BulletRepository, TailorDocuments],
})
export class InfraModule {}
