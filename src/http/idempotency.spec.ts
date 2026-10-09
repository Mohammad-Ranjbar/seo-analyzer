import {
  createIdempotencyFingerprint,
  createIdempotencyScopeKey,
  MAX_IDEMPOTENCY_KEY_LENGTH,
  parseIdempotencyKey,
} from './idempotency.js';
import { ProblemException } from './problem.exception.js';

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

describe('parseIdempotencyKey', () => {
  it('accepts a UUID-shaped opaque key', () => {
    expect(parseIdempotencyKey('0199b610-4a38-7000-8000-000000000001')).toBe(
      '0199b610-4a38-7000-8000-000000000001',
    );
  });

  it('allows omission for endpoints where the key is optional', () => {
    expect(parseIdempotencyKey(undefined, false)).toBeUndefined();
  });

  it('rejects a missing required key', () => {
    expectProblem(() => parseIdempotencyKey(undefined), 'IDEMPOTENCY_KEY_REQUIRED');
  });

  it.each(['contains whitespace', '', 'a'.repeat(MAX_IDEMPOTENCY_KEY_LENGTH + 1)])(
    'rejects invalid key %s',
    (key) => {
      expectProblem(() => parseIdempotencyKey(key), 'IDEMPOTENCY_KEY_INVALID');
    },
  );
});

describe('idempotency fingerprint', () => {
  const baseRequest = {
    method: 'POST',
    route: '/api/crawl-runs',
    apiVersion: '1',
    contentType: 'application/json',
  } as const;

  it('is stable when JSON object keys are reordered', () => {
    const first = createIdempotencyFingerprint({
      ...baseRequest,
      body: { projectId: 'project-id', options: { limit: 10, mode: 'html' } },
    });
    const second = createIdempotencyFingerprint({
      ...baseRequest,
      body: { options: { mode: 'html', limit: 10 }, projectId: 'project-id' },
    });

    expect(first).toBe(second);
  });

  it('changes when the effective request changes', () => {
    const first = createIdempotencyFingerprint({ ...baseRequest, body: { projectId: 'one' } });
    const second = createIdempotencyFingerprint({ ...baseRequest, body: { projectId: 'two' } });

    expect(first).not.toBe(second);
  });

  it('scopes equal client keys to the authenticated tenant and operation', () => {
    const first = createIdempotencyScopeKey({
      principalId: 'user-id',
      tenantId: 'workspace-one',
      method: 'POST',
      route: '/api/crawl-runs',
      key: 'same-client-key',
    });
    const second = createIdempotencyScopeKey({
      principalId: 'user-id',
      tenantId: 'workspace-two',
      method: 'POST',
      route: '/api/crawl-runs',
      key: 'same-client-key',
    });

    expect(first).not.toBe(second);
  });
});
