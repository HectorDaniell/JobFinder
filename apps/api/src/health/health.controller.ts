import { Controller, Get } from '@nestjs/common';

/**
 * Health check mínimo: confirma que la app HTTP está viva. Más adelante puede
 * extenderse a verificar la BD (un `select 1`) y Redis.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {status: 'ok', timestamp: new Date().toISOString() };
  }
}
