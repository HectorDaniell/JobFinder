/**
 * ZOD VALIDATION PIPE — valida la entrada HTTP contra un schema Zod.
 *
 * Un "Pipe" en NestJS se ejecuta ANTES del handler del controlador: recibe el
 * valor crudo que llegó por HTTP (body, params, query) y devuelve el valor ya
 * validado y TIPADO. Si el valor no cumple el schema, lanzamos ValidationError
 * (de core) — un DomainError con statusCode 400 — para que el
 * DomainExceptionFilter lo formatee igual que cualquier otro error de dominio.
 * Así toda la API responde los errores con un ÚNICO formato.
 *
 * Reutilizamos Zod (ya presente en core y db) en lugar de class-validator: una
 * sola fuente de verdad para validar, sin decoradores repartidos en clases-DTO.
 *
 * No lleva @Injectable(): no lo construye el contenedor de DI, sino nosotros a
 * mano en cada ruta —> `@Body(new ZodValidationPipe(CreateProfileSchema))`—,
 * porque cada endpoint valida contra un schema distinto.
 */

import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ValidationError } from '@jobfinder/core';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    // safeParse NO lanza: devuelve { success, data | error }. Así controlamos
    // nosotros el error y emitimos nuestro ValidationError en vez del ZodError.
    const result = this.schema.safeParse(value);

    if (!result.success) {
      // Priorizamos el primer problema para un mensaje claro. `path` señala el
      // campo (p.ej. ["email"] -> "email"); anidados quedan como "a.b".
      const issue = result.error.issues[0];
      const field = issue?.path.join('.') || undefined;
      throw new ValidationError(issue?.message ?? 'Invalid input', field);
    }

    return result.data;
  }
}
