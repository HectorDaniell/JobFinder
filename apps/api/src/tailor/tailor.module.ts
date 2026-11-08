import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { TailorController } from './tailor.controller';

/**
 * Módulo de la feature Tailor. Importa InfraModule (que exporta TailorDocuments,
 * ya cableado con el LLM perezoso + DocumentAdapter) para inyectarlo en el
 * controlador.
 */
@Module({
  imports: [InfraModule],
  controllers: [TailorController],
})
export class TailorModule {}
