import './load-env'; // debe ir PRIMERO: carga .env antes de importar módulos que lo usan

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // Filtro global: cualquier DomainError lanzado en pipes, controladores o casos
  // de uso se traduce aquí a su respuesta HTTP (statusCode + JSON uniforme).
  app.useGlobalFilters(new DomainExceptionFilter());

  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ API running on http://localhost:${port}`);
}

bootstrap();
