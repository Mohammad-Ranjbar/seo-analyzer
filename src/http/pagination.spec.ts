import {
  CursorCodec,
  createPageResponse,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  parsePaginationQuery,
} from './pagination.js';
import { ProblemException } from './problem.exception.js';

const CURSOR_SECRET = 'a-development-only-cursor-secret-with-32-bytes';

function expectProblem(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error('Expected action to throw.');
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemException);
    expect((error as ProblemException).getStatus()).toBe(400);
    expect((error as ProblemException).getResponse()).toMatchObject({ code });
  }
}

describe('pagination contract', () => {
  it('uses the default limit and omits an absent cursor', () => {
    expect(parsePaginationQuery({})).toEqual({ limit: DEFAULT_PAGE_LIMIT });
  });

  it('accepts the maximum limit and a URL-safe cursor', () => {
    expect(parsePaginationQuery({ limit: String(MAX_PAGE_LIMIT), cursor: 'abc_123-Z' })).toEqual({
      limit: MAX_PAGE_LIMIT,
      cursor: 'abc_123-Z',
    });
  });

  it.each(['0', '01', '101', '-1', '1.5'])('rejects invalid limit %s', (limit) => {
    expectProblem(() => parsePaginationQuery({ limit }), 'PAGINATION_LIMIT_INVALID');
  });

  it('reports the returned size and omits nextCursor on the last page', () => {
    expect(createPageResponse([{ id: 1 }])).toEqual({
      data: [{ id: 1 }],
      page: { size: 1 },
    });
  });
});

describe('CursorCodec', () => {
  const codec = new CursorCodec(CURSOR_SECRET);
  const expiresAt = 2_000_000_000;
  const scope = 'workspace:1|resource:projects|sort:createdAt-desc,id-desc';

  it('round-trips an encrypted position for the matching scope', () => {
    const token = codec.encode({
      scope,
      position: { createdAt: '2026-10-09T08:00:00.000Z', id: 'project-id' },
      expiresAt,
    });

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain('project-id');
    expect(codec.decode(token, scope, expiresAt - 1)).toEqual({
      createdAt: '2026-10-09T08:00:00.000Z',
      id: 'project-id',
    });
  });

  it('rejects a cursor used with a different query scope', () => {
    const token = codec.encode({ scope, position: { id: 'project-id' }, expiresAt });

    expectProblem(
      () => codec.decode(token, 'workspace:2|resource:projects', expiresAt - 1),
      'PAGINATION_CURSOR_MISMATCH',
    );
  });

  it('rejects a modified cursor', () => {
    const token = codec.encode({ scope, position: { id: 'project-id' }, expiresAt });
    const replacement = token.endsWith('A') ? 'B' : 'A';

    expectProblem(
      () => codec.decode(`${token.slice(0, -1)}${replacement}`, scope, expiresAt - 1),
      'PAGINATION_CURSOR_INVALID',
    );
  });

  it('rejects an expired cursor', () => {
    const token = codec.encode({ scope, position: { id: 'project-id' }, expiresAt });

    expectProblem(() => codec.decode(token, scope, expiresAt), 'PAGINATION_CURSOR_EXPIRED');
  });
});
