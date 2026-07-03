import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [InfraModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
