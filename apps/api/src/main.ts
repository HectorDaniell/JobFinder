import './load-env'; // debe ir PRIMERO: carga .env antes de importar módulos que lo usan

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  // CORS: el navegador bloquea que la web (:3000) llame a la API (:3001) por ser
  // distinto origen, salvo que la API lo autorice. En dev permitimos el origen
  // del front; en prod se restringe vía WEB_ORIGIN.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  // El DomainExceptionFilter se registra como APP_FILTER dentro de AppModule
  // (no aquí), para que aplique igual en producción y en los tests e2e.
  const port = process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`✅ API running on http://localhost:${port}`);
}

bootstrap();
