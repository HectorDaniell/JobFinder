import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // Application context = NestJS sin servidor HTTP (solo DI + procesadores de colas)
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();
  console.log('✅ Worker started, listening to Redis for jobs...');
}

bootstrap();
