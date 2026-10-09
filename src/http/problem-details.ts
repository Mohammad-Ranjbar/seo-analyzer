import type { Response } from 'express';

export interface ValidationProblem {
  code: string;
  detail: string;
  pointer: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: ValidationProblem[];
}

export interface ProblemInput {
  status: number;
  title: string;
  detail: string;
  code: string;
  errors?: ValidationProblem[];
}

function toProblemType(code: string): string {
  const problemName = code.toLowerCase().replaceAll('_', '-');

  return `tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/${problemName}`;
}

function getRequestId(response: Response): string {
  const requestId = response.getHeader('X-Request-ID');

  if (typeof requestId !== 'string') {
    throw new Error('X-Request-ID must be assigned before writing a problem response.');
  }

  return requestId;
}

export function createProblemDetails(response: Response, input: ProblemInput): ProblemDetails {
  const requestId = getRequestId(response);

  return {
    type: toProblemType(input.code),
    title: input.title,
    status: input.status,
    detail: input.detail,
    instance: `urn:uuid:${requestId}`,
    code: input.code,
    ...(input.errors === undefined ? {} : { errors: input.errors }),
  };
}

export function writeProblem(response: Response, input: ProblemInput): void {
  response
    .status(input.status)
    .type('application/problem+json')
    .json(createProblemDetails(response, input));
}
