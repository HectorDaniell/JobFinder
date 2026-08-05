import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { InfraModule } from './infra/infra.module';
import { HealthController } from './health/health.controller';
import { ProfilesModule } from './profiles/profiles.module';
import { BulletsModule } from './bullets/bullets.module';
import { ExperiencesModule } from './experiences/experiences.module';
import { TailorModule } from './tailor/tailor.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

/**
 * El DomainExceptionFilter se registra como APP_FILTER (en vez de main.ts con
 * useGlobalFilters) para que Nest lo aplique de forma global TANTO en producción
 * como en los tests e2e —que construyen la app con Test.createTestingModule y no
 * ejecutan main.ts—. Una sola fuente de verdad para el manejo de errores.
 */
@Module({
  imports: [InfraModule, ProfilesModule, BulletsModule, ExperiencesModule, TailorModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
