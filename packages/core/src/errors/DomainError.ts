/**
 * Base class for domain errors.
 * Keeps error handling at the domain level (no framework specifics).
 */

export class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string = 'DOMAIN_ERROR', statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, DomainError.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}
