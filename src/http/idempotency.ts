import { createHash } from 'node:crypto';
import { ProblemException } from './problem.exception.js';

export const MAX_IDEMPOTENCY_KEY_LENGTH = 180;

type CanonicalJson =
  | boolean
  | null
  | number
  | string
  | CanonicalJson[]
  | { [key: string]: CanonicalJson };

export interface IdempotencyFingerprintInput {
  method: string;
  route: string;
  apiVersion: string;
  body: unknown;
  contentType?: string;
}

export interface IdempotencyScopeInput {
  principalId: string;
  tenantId?: string;
  method: string;
  route: string;
  key: string;
}

function idempotencyProblem(code: string, title: string, detail: string): ProblemException {
  return new ProblemException({ status: 400, code, title, detail });
}

function canonicalize(value: unknown): CanonicalJson {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Idempotency fingerprint input must contain finite numbers.');
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);

    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError('Idempotency fingerprint input must contain JSON objects only.');
    }

    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }

  throw new TypeError('Idempotency fingerprint input must be valid JSON.');
}

function sha256(value: CanonicalJson): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}

export function parseIdempotencyKey(
  value: string | string[] | undefined,
  required = true,
): string | undefined {
  if (value === undefined) {
    if (!required) {
      return undefined;
    }

    throw idempotencyProblem(
      'IDEMPOTENCY_KEY_REQUIRED',
      'Idempotency key is required',
      'Send one Idempotency-Key header for this operation.',
    );
  }

  if (
    Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_IDEMPOTENCY_KEY_LENGTH ||
    !/^[\x21-\x7E]+$/.test(value)
  ) {
    throw idempotencyProblem(
      'IDEMPOTENCY_KEY_INVALID',
      'Idempotency key is invalid',
      `Idempotency-Key must contain 1 to ${MAX_IDEMPOTENCY_KEY_LENGTH} printable ASCII characters without whitespace.`,
    );
  }

  return value;
}

export function createIdempotencyFingerprint(input: IdempotencyFingerprintInput): string {
  return sha256(
    canonicalize({
      method: input.method.toUpperCase(),
      route: input.route,
      apiVersion: input.apiVersion,
      contentType: input.contentType ?? null,
      body: input.body,
    }),
  );
}

export function createIdempotencyScopeKey(input: IdempotencyScopeInput): string {
  return sha256(
    canonicalize({
      principalId: input.principalId,
      tenantId: input.tenantId ?? null,
      method: input.method.toUpperCase(),
      route: input.route,
      key: input.key,
    }),
  );
}
