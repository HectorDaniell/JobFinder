import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '@jobfinder/core';
import { ZodValidationPipe } from '../src/common/pipes/zod-validation.pipe';

/**
 * Tests del ZodValidationPipe (el "portero" de la entrada HTTP).
 *
 * Son unitarios puros: instanciamos el pipe con un schema de ejemplo y llamamos
 * transform() directamente. No arrancamos NestJS ni servidor ni BD.
 */

// Schema de ejemplo para ejercitar el pipe (dos campos, orden fijo).
const schema = z.object({
  email: z.string().email(),
  age: z.number().int().positive(),
});

describe('ZodValidationPipe', () => {
  it('devuelve la data validada y tipada cuando la entrada es correcta', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { email: 'ana@example.com', age: 30 };

    const result = pipe.transform(input);

    expect(result).toEqual(input);
  });

  it('lanza ValidationError (400) señalando el campo que falló', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = { email: 'no-es-email', age: 30 };

    let error: unknown;
    try {
      pipe.transform(input);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).field).toBe('email');
    expect((error as ValidationError).statusCode).toBe(400);
    expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
  });

  it('reporta el primer campo problemático cuando faltan varios', () => {
    const pipe = new ZodValidationPipe(schema);
    const input = {}; // faltan email y age

    let error: unknown;
    try {
      pipe.transform(input);
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ValidationError);
    // Zod evalúa las claves en el orden del schema: 'email' va primero.
    expect((error as ValidationError).field).toBe('email');
  });
});
