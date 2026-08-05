import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { ExperiencesController } from './experiences.controller';

/** Módulo de la feature Experiences. Los repos vienen de InfraModule. */
@Module({
  imports: [InfraModule],
  controllers: [ExperiencesController],
})
export class ExperiencesModule {}
