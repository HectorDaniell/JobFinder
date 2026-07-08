import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module';
import { HealthController } from './health/health.controller';
import { ProfilesModule } from './profiles/profiles.module';
import { BulletsModule } from './bullets/bullets.module';
import { TailorModule } from './tailor/tailor.module';

@Module({
  imports: [InfraModule, ProfilesModule, BulletsModule, TailorModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
