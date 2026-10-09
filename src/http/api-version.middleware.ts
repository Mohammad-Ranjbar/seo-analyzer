import type { NextFunction, Request, Response } from 'express';
import { writeProblem } from './problem-details.js';

export const API_VERSION_HEADER = 'API-Version';
export const CURRENT_API_VERSION = '1';

function requiresApiVersion(path: string): boolean {
  const normalizedPath = path.length > 1 ? path.replace(/\/$/, '') : path;

  return normalizedPath.startsWith('/api/') && normalizedPath !== '/api/health';
}

export function apiVersionMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!requiresApiVersion(request.path)) {
    next();
    return;
  }

  const version = request.headers['api-version'];

  if (version === undefined) {
    writeProblem(response, {
      status: 400,
      title: 'API version is required',
      detail: `Send the ${API_VERSION_HEADER} header with value ${CURRENT_API_VERSION}.`,
      code: 'API_VERSION_REQUIRED',
    });
    return;
  }

  if (Array.isArray(version) || !/^[1-9]\d*$/.test(version)) {
    writeProblem(response, {
      status: 400,
      title: 'API version is invalid',
      detail: `${API_VERSION_HEADER} must contain one positive integer without a prefix.`,
      code: 'API_VERSION_INVALID',
    });
    return;
  }

  if (version !== CURRENT_API_VERSION) {
    writeProblem(response, {
      status: 406,
      title: 'API version is not supported',
      detail: `This service currently supports ${API_VERSION_HEADER}: ${CURRENT_API_VERSION}.`,
      code: 'API_VERSION_UNSUPPORTED',
    });
    return;
  }

  next();
}
