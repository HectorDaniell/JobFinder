import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module';
import { HealthController } from './health/health.controller';
import { ProfilesModule } from './profiles/profiles.module';

@Module({
  imports: [InfraModule, ProfilesModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
