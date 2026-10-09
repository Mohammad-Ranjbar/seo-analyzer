import { describe, expect, it } from 'vitest';
import {
  authenticationPolicy,
  crawlPolicy,
  exponentialBackoffWithJitter,
  isRetryableStatus,
  retentionPolicy,
} from './platform-policy.js';

describe('platform policy', () => {
  it('keeps defaults inside hard limits', () => {
    expect(crawlPolicy.defaultMaxPages).toBeLessThanOrEqual(crawlPolicy.hardMaxPages);
    expect(crawlPolicy.defaultMaxDepth).toBeLessThanOrEqual(crawlPolicy.hardMaxDepth);
    expect(crawlPolicy.defaultRequestTimeoutMs).toBeLessThanOrEqual(
      crawlPolicy.hardRequestTimeoutMs,
    );
    expect(authenticationPolicy.otpMaximumAttempts).toBe(5);
    expect(retentionPolicy.idempotencyHours).toBe(24);
  });

  it('calculates bounded exponential backoff with jitter', () => {
    expect(exponentialBackoffWithJitter(1, () => 0)).toBe(500);
    expect(exponentialBackoffWithJitter(2, () => 1)).toBe(2_000);
    expect(exponentialBackoffWithJitter(99, () => 1)).toBe(900_000);
    expect(() => exponentialBackoffWithJitter(0)).toThrow(RangeError);
  });

  it('retries only transient HTTP outcomes', () => {
    expect(isRetryableStatus(408)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });
});
