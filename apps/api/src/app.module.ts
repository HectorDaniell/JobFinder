import { Module } from '@nestjs/common';
import { InfraModule } from './infra/infra.module';
import { HealthController } from './health/health.controller';
import { ProfilesModule } from './profiles/profiles.module';
import { BulletsModule } from './bullets/bullets.module';

@Module({
  imports: [InfraModule, ProfilesModule, BulletsModule ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
