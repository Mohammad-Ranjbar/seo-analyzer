---
title: ADR 0018 - BullMQ job processing
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0018 — BullMQ job processing

## Decision

Use BullMQ with Redis and a separately deployed worker process. API nodes enqueue durable jobs and return resource identifiers; workers process crawl, analysis, generation, purge, and webhook queues. Jobs carry identifiers only, establish tenant context inside a transaction, and are idempotent.

Use exponential backoff with jitter. Retry transient network and provider failures; do not retry validation, authorization, robots denial, or permanent 4xx outcomes. Defaults are 5 attempts for crawls and generation, 8 for webhooks, and 3 for purge orchestration. Exhausted jobs enter a retained failed/dead-letter state for operator review.

## Consequences

- Web processes do not execute long-running crawl work.
- Queue names and payload schemas are versioned independently from public API v1.
- Concurrency is bounded per queue, workspace, and destination host.

[Persian version](0018-bullmq-job-processing.fa.md)
