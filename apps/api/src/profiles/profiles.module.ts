import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { ProfilesController } from './profiles.controller';

/**
 * Módulo de la feature Profiles. Importa InfraModule (que exporta
 * ProfileRepository) para que Nest pueda INYECTAR el repo en el controlador.
 */
@Module({
  imports: [InfraModule],
  controllers: [ProfilesController],
})
export class ProfilesModule {}
