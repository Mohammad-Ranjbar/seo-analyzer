import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ValidationProblem } from './problem-details.js';
import { writeProblem } from './problem-details.js';

interface ExceptionBody {
  code?: unknown;
  detail?: unknown;
  errors?: unknown;
  message?: unknown;
  title?: unknown;
}

const STATUS_CODE_OVERRIDES: Readonly<Record<number, string>> = {
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

function isExceptionBody(value: unknown): value is ExceptionBody {
  return typeof value === 'object' && value !== null;
}

function toCode(status: number, body: unknown): string {
  if (
    isExceptionBody(body) &&
    typeof body.code === 'string' &&
    /^[A-Z][A-Z0-9_]*$/.test(body.code)
  ) {
    return body.code;
  }

  return STATUS_CODE_OVERRIDES[status] ?? `HTTP_${status}`;
}

function toDetail(status: number, body: unknown): string {
  if (status >= 500) {
    return 'The server could not complete the request.';
  }

  if (typeof body === 'string') {
    return body;
  }

  if (isExceptionBody(body) && typeof body.detail === 'string') {
    return body.detail;
  }

  if (isExceptionBody(body) && typeof body.message === 'string') {
    return body.message;
  }

  return STATUS_CODES[status] ?? 'The request could not be completed.';
}

function toTitle(status: number, body: unknown): string {
  if (status < 500 && isExceptionBody(body) && typeof body.title === 'string') {
    return body.title;
  }

  return STATUS_CODES[status] ?? 'Request failed';
}

function toValidationProblems(body: unknown): ValidationProblem[] | undefined {
  if (!isExceptionBody(body) || !Array.isArray(body.errors)) {
    return undefined;
  }

  const errors = body.errors.filter(
    (error): error is ValidationProblem =>
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      'detail' in error &&
      typeof error.detail === 'string' &&
      'pointer' in error &&
      typeof error.pointer === 'string',
  );

  return errors.length === body.errors.length ? errors : undefined;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;

    writeProblem(response, {
      status,
      title: toTitle(status, body),
      detail: toDetail(status, body),
      code: toCode(status, body),
      errors: toValidationProblems(body),
    });

    if (status >= 500) {
      // Preserve the request method and path for server-side diagnostics without exposing internals.
      console.error('Unhandled HTTP exception', {
        method: request.method,
        path: request.path,
        errorName: exception instanceof Error ? exception.name : 'UnknownError',
      });
    }
  }
}
