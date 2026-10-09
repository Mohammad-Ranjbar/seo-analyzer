import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { ProblemException } from './problem.exception.js';

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;
export const MAX_CURSOR_LENGTH = 2_048;

const CURSOR_VERSION = 1;
const INITIALIZATION_VECTOR_LENGTH = 12;
const AUTHENTICATION_TAG_LENGTH = 16;
const MINIMUM_CURSOR_SECRET_BYTES = 32;

export type CursorPosition = Readonly<Record<string, boolean | number | string | null>>;

export interface PaginationQuery {
  limit: number;
  cursor?: string;
}

export interface PageMetadata {
  size: number;
  nextCursor?: string;
}

export interface PageResponse<T> {
  data: T[];
  page: PageMetadata;
}

interface CursorPayload {
  v: typeof CURSOR_VERSION;
  scopeHash: string;
  position: CursorPosition;
  expiresAt: number;
}

export interface EncodeCursorInput {
  scope: string;
  position: CursorPosition;
  expiresAt: number;
}

function paginationProblem(code: string, title: string, detail: string): ProblemException {
  return new ProblemException({ status: 400, code, title, detail });
}

function parseLimit(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_PAGE_LIMIT;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > MAX_PAGE_LIMIT) {
    throw paginationProblem(
      'PAGINATION_LIMIT_INVALID',
      'Pagination limit is invalid',
      `limit must be an integer from 1 through ${MAX_PAGE_LIMIT}.`,
    );
  }

  return Number(value);
}

function parseCursor(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_CURSOR_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw paginationProblem(
      'PAGINATION_CURSOR_INVALID',
      'Pagination cursor is invalid',
      'cursor must be one non-empty URL-safe token returned by this API.',
    );
  }

  return value;
}

function hashScope(scope: string): string {
  return createHash('sha256').update(scope, 'utf8').digest('base64url');
}

function isCursorPosition(value: unknown): value is CursorPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (item) =>
        item === null ||
        typeof item === 'boolean' ||
        (typeof item === 'number' && Number.isFinite(item)) ||
        typeof item === 'string',
    )
  );
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'v' in value &&
    value.v === CURSOR_VERSION &&
    'scopeHash' in value &&
    typeof value.scopeHash === 'string' &&
    'position' in value &&
    isCursorPosition(value.position) &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number' &&
    Number.isSafeInteger(value.expiresAt)
  );
}

export function parsePaginationQuery(query: Readonly<Record<string, unknown>>): PaginationQuery {
  const cursor = parseCursor(query.cursor);

  return {
    limit: parseLimit(query.limit),
    ...(cursor === undefined ? {} : { cursor }),
  };
}

export function createPageResponse<T>(data: T[], nextCursor?: string): PageResponse<T> {
  return {
    data,
    page: {
      size: data.length,
      ...(nextCursor === undefined ? {} : { nextCursor }),
    },
  };
}

export class CursorCodec {
  readonly #key: Buffer;

  constructor(secret: string | Buffer) {
    const secretBuffer = typeof secret === 'string' ? Buffer.from(secret, 'utf8') : secret;

    if (secretBuffer.byteLength < MINIMUM_CURSOR_SECRET_BYTES) {
      throw new Error(`Cursor secret must contain at least ${MINIMUM_CURSOR_SECRET_BYTES} bytes.`);
    }

    this.#key = createHash('sha256').update(secretBuffer).digest();
  }

  encode(input: EncodeCursorInput): string {
    if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= 0) {
      throw new Error('Cursor expiry must be a positive Unix timestamp in seconds.');
    }

    if (input.scope.length === 0) {
      throw new Error('Cursor scope must not be empty.');
    }

    if (!isCursorPosition(input.position)) {
      throw new Error('Cursor position must contain JSON primitive values only.');
    }

    const payload: CursorPayload = {
      v: CURSOR_VERSION,
      scopeHash: hashScope(input.scope),
      position: input.position,
      expiresAt: input.expiresAt,
    };
    const initializationVector = randomBytes(INITIALIZATION_VECTOR_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.#key, initializationVector);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const token = Buffer.concat([initializationVector, cipher.getAuthTag(), ciphertext]).toString(
      'base64url',
    );

    if (token.length > MAX_CURSOR_LENGTH) {
      throw new Error(`Encoded cursor exceeds ${MAX_CURSOR_LENGTH} characters.`);
    }

    return token;
  }

  decode(
    token: string,
    expectedScope: string,
    nowInSeconds = Math.floor(Date.now() / 1_000),
  ): CursorPosition {
    const parsedToken = parseCursor(token);

    if (parsedToken === undefined) {
      throw new Error('Cursor token is required.');
    }

    try {
      const bytes = Buffer.from(parsedToken, 'base64url');
      const minimumLength = INITIALIZATION_VECTOR_LENGTH + AUTHENTICATION_TAG_LENGTH + 1;

      if (bytes.byteLength < minimumLength) {
        throw new Error('Cursor token is too short.');
      }

      const initializationVector = bytes.subarray(0, INITIALIZATION_VECTOR_LENGTH);
      const authenticationTag = bytes.subarray(
        INITIALIZATION_VECTOR_LENGTH,
        INITIALIZATION_VECTOR_LENGTH + AUTHENTICATION_TAG_LENGTH,
      );
      const ciphertext = bytes.subarray(INITIALIZATION_VECTOR_LENGTH + AUTHENTICATION_TAG_LENGTH);
      const decipher = createDecipheriv('aes-256-gcm', this.#key, initializationVector);
      decipher.setAuthTag(authenticationTag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
        'utf8',
      );
      const payload: unknown = JSON.parse(plaintext);

      if (!isCursorPayload(payload)) {
        throw new Error('Cursor payload has an unsupported shape.');
      }

      const actualScope = Buffer.from(payload.scopeHash, 'utf8');
      const expectedScopeHash = Buffer.from(hashScope(expectedScope), 'utf8');

      if (
        actualScope.byteLength !== expectedScopeHash.byteLength ||
        !timingSafeEqual(actualScope, expectedScopeHash)
      ) {
        throw paginationProblem(
          'PAGINATION_CURSOR_MISMATCH',
          'Pagination cursor does not match this request',
          'Use the cursor with the same resource, tenant scope, filters, and ordering.',
        );
      }

      if (payload.expiresAt <= nowInSeconds) {
        throw paginationProblem(
          'PAGINATION_CURSOR_EXPIRED',
          'Pagination cursor has expired',
          'Restart traversal without a cursor.',
        );
      }

      return payload.position;
    } catch (error) {
      if (error instanceof ProblemException) {
        throw error;
      }

      throw paginationProblem(
        'PAGINATION_CURSOR_INVALID',
        'Pagination cursor is invalid',
        'Use an unmodified cursor returned by this API.',
      );
    }
  }
}
