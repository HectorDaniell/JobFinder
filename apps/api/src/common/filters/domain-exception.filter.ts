/**
 * DOMAIN EXCEPTION FILTER — traduce errores de dominio a respuestas HTTP.
 *
 * Nuestros casos de uso y pipes lanzan DomainError (NotFoundError -> 404,
 * ValidationError -> 400, ConflictError -> 409, ...). Cada error YA lleva su
 * `statusCode` y su `code`. Este filtro los captura en un SOLO lugar y arma una
 * respuesta JSON uniforme, en vez de dejar que Nest devuelva un 500 genérico.
 *
 * @Catch(DomainError) atrapa DomainError y todas sus subclases (por eso el fix
 * de `instanceof` en core era prerrequisito). Las demás excepciones
 * (HttpException nativas, errores inesperados) las sigue manejando Nest.
 */

import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { DomainError, ValidationError } from '@jobfinder/core';

/**
 * Forma mínima del "reply" que usamos. En lugar de acoplarnos al tipo completo
 * de Fastify, declaramos solo lo que tocamos (mismo criterio que los puertos
 * estructurales del core, p.ej. ProfileProvider): el objeto de respuesta de
 * Fastify satisface esta interfaz sin que la importemos.
 */
interface HttpReply {
  status(code: number): { send(payload: unknown): unknown };
}

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<HttpReply>();

    const body = {
      error: {
        code: exception.code,
        message: exception.message,
        // Solo los errores de validación llevan `field`; lo incluimos si existe.
        ...(exception instanceof ValidationError && exception.field
          ? { field: exception.field }
          : {}),
      },
    };

    reply.status(exception.statusCode).send(body);
  }
}
