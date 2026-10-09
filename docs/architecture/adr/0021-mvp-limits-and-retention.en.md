---
title: ADR 0021 - MVP limits and retention
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0021 — MVP limits and retention

## Decision

Default per-workspace limits are 10 active projects, 10 approved competitors per project, one running crawl per project, 2 concurrent crawl jobs per workspace, 2,000 pages and depth 5 per crawl, 1 request/second per host, a 30-second request deadline, and at most 100 headless pages. Administrator caps are 10,000 pages, depth 10, 60-second delay, 120-second request timeout, and 100% headless budget as enforced by the database.

Keep extracted crawl snapshots, findings, scores, and usage history while the project exists. Keep operational job logs for 30 days, failed/dead-letter metadata for 90 days, webhook response bodies for 7 days, audit logs for 365 days, and idempotency records for 24 hours. Soft-deleted tenant data has a 30-day recovery window before asynchronous purge; backups follow a separately tested lifecycle.

## Consequences

- Limits are configuration with these values as safe defaults, but callers cannot exceed hard caps.
- Full HTML and authentication secrets are never retention candidates because they are never stored.
- Retention cleanup is idempotent, tenant-scoped, observable, and resumable.

[Persian version](0021-mvp-limits-and-retention.fa.md)
