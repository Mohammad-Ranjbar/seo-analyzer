export const crawlPolicy = Object.freeze({
  defaultMaxPages: 2_000,
  hardMaxPages: 10_000,
  defaultMaxDepth: 5,
  hardMaxDepth: 10,
  defaultRequestDelayMs: 1_000,
  minimumRequestDelayMs: 250,
  defaultRequestTimeoutMs: 30_000,
  hardRequestTimeoutMs: 120_000,
  defaultMaxHeadlessPages: 100,
  maximumRedirects: 5,
  maximumResponseBytes: 10 * 1024 * 1024,
  concurrentJobsPerWorkspace: 2,
  concurrentRunsPerProject: 1,
});

export const authenticationPolicy = Object.freeze({
  accessTokenTtlSeconds: 15 * 60,
  refreshIdleTtlSeconds: 30 * 24 * 60 * 60,
  refreshAbsoluteTtlSeconds: 90 * 24 * 60 * 60,
  otpDigits: 6,
  otpTtlSeconds: 5 * 60,
  otpMaximumAttempts: 5,
  argon2id: Object.freeze({ memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 }),
});

export const retentionPolicy = Object.freeze({
  idempotencyHours: 24,
  webhookResponseBodyDays: 7,
  operationalJobLogDays: 30,
  deletionRecoveryDays: 30,
  deadLetterMetadataDays: 90,
  auditLogDays: 365,
});

export const retryPolicy = Object.freeze({
  crawlAttempts: 5,
  generationAttempts: 5,
  webhookAttempts: 8,
  purgeAttempts: 3,
  initialBackoffMs: 1_000,
  maximumBackoffMs: 15 * 60 * 1_000,
});

export function exponentialBackoffWithJitter(
  attempt: number,
  random: () => number = Math.random,
): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new RangeError('attempt must be a positive integer');
  }

  const exponential = Math.min(
    retryPolicy.initialBackoffMs * 2 ** (attempt - 1),
    retryPolicy.maximumBackoffMs,
  );
  const jitterMultiplier = 0.5 + random() * 0.5;

  return Math.floor(exponential * jitterMultiplier);
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}
