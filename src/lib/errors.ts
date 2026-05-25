export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = "APP_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    details?: Record<string, string[]>,
  ) {
    super(message, "VALIDATION_ERROR", 400);
    this.details = details;
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "You are not authorized to perform this action") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, "NOT_FOUND", 404);
  }
}

export class PeriodClosedError extends AppError {
  public readonly period: string;

  constructor(period: string) {
    super(`Period '${period}' is closed and cannot accept new transactions`, "PERIOD_CLOSED", 422);
    this.period = period;
  }
}

export class DuplicateError extends AppError {
  public readonly field: string;
  public readonly value: string;

  constructor(field: string, value: string) {
    super(`A record with ${field} '${value}' already exists`, "DUPLICATE_ERROR", 409);
    this.field = field;
    this.value = value;
  }
}