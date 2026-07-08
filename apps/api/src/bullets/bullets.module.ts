import { Module } from "@nestjs/common";
import { InfraModule } from '../infra/infra.module';
import { BulletsController } from './bullets.controller';

@Module({
    imports: [InfraModule],
    controllers: [BulletsController]
})
export class BulletsModule { }
