import 'reflect-metadata'; // el decorador @Catch del filtro lo usa al cargar el módulo
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { NotFoundError, ValidationError, ConflictError } from '@jobfinder/core';
import { DomainExceptionFilter } from '../src/common/filters/domain-exception.filter';

/**
 * Tests del DomainExceptionFilter (el "vocero" de salida).
 *
 * Doblamos el `reply` de Fastify: el filtro hace `reply.status(code).send(body)`,
 * así que status() debe devolver un objeto con send(). Espiamos ambos con
 * vi.fn() y verificamos con qué se llamaron. También doblamos el ArgumentsHost
 * de Nest para que devuelva ese reply.
 */

let send: ReturnType<typeof vi.fn>;
let status: ReturnType<typeof vi.fn>;
let host: ArgumentsHost;

beforeEach(() => {
  send = vi.fn();
  status = vi.fn().mockReturnValue({ send }); // status(code) -> { send }
  const reply = { status };
  host = {
    switchToHttp: () => ({ getResponse: () => reply }),
  } as unknown as ArgumentsHost;
});

describe('DomainExceptionFilter', () => {
  it('mapea NotFoundError a HTTP 404 con code y message', () => {
    const filter = new DomainExceptionFilter();

    filter.catch(new NotFoundError('Profile', 'abc-123'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Profile not found: abc-123' },
    });
  });

  it('incluye "field" cuando el error de validación lo especifica', () => {
    const filter = new DomainExceptionFilter();

    filter.catch(new ValidationError('Expected string', 'email'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Expected string', field: 'email' },
    });
  });

  it('omite "field" en un ValidationError sin campo', () => {
    const filter = new DomainExceptionFilter();

    filter.catch(new ValidationError('Invalid input'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    });
  });

  it('mapea otros DomainError (p.ej. ConflictError) a su statusCode', () => {
    const filter = new DomainExceptionFilter();

    filter.catch(new ConflictError('Email already exists'), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(send).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: 'Email already exists' },
    });
  });
});
