import { Module } from '@nestjs/common';
import { InfraModule } from '../infra/infra.module';
import { JobsController } from './jobs.controller';

@Module({
  imports: [InfraModule],
  controllers: [JobsController],
})
export class JobsModule {}
