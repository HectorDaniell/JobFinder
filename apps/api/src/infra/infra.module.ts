import { Module } from '@nestjs/common';
import { db, ProfileRepository, BulletRepository } from '@jobfinder/db';

/**
 * COMPOSITION ROOT (parcial): cablea las clases "planas" de los packages —que
 * no son `@Injectable` de Nest— como providers, para que los controllers las
 * inyecten. Aquí `db` → repositorios se conectan.
 *
 * Usamos las clases como TOKENS con `useFactory` (no `useClass`) porque las
 * construimos nosotros pasándoles sus dependencias (el cliente `db`).
 *
 * En el Paso 6 se sumarán aquí `ClaudeAdapter`, `DocumentAdapter` y el caso de
 * uso `TailorDocuments` (que sí necesitan la API key de Anthropic).
 */
@Module({
  providers: [
    { provide: ProfileRepository, useFactory: () => new ProfileRepository(db) },
    { provide: BulletRepository, useFactory: () => new BulletRepository(db) },
  ],
  exports: [ProfileRepository, BulletRepository],
})
export class InfraModule {}
