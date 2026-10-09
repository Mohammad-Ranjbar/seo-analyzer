---
title: Architecture Overview
lang: en
status: draft
updated: 2026-10-09
---

# Architecture Overview

## Current state

The repository uses NestJS 12.0.1 and TypeScript. Runtime architecture is not yet approved, and this document does not finalize an ORM, queue, or cache.

## Logical boundaries

- Identity: users, contacts, credentials, sessions, and OTP
- Tenancy: organizations, memberships, workspaces, and RLS
- Access control: permission catalog, custom roles, and API-key scopes
- Projects: SEO projects, scope, properties, and competitors
- Crawling: schedules, runs, pages, snapshots, and links
- Analysis: rules, findings, scores, and comparisons
- Actions: action items, status history, and verification
- Catalog: products, categories, brands, and sources
- Generation: versioned SEO suggestions and user decisions
- Integrations: webhooks and optional AI providers
- Governance: usage, audit, waitlist, and deletion

## Data flow

1. An authenticated request resolves an active organization and workspace.
2. RLS and application authorization enforce tenant and permission access.
3. A crawl run is queued and URLs are processed within configured limits.
4. Extracted data is stored and versioned rules are evaluated.
5. Scores and action items are created or updated.
6. Status is exposed by polling and optionally delivered through a signed webhook.

## Architectural constraints

- Tenant context must be explicit and auditable in HTTP requests and background jobs.
- Workers must not bypass RLS without a validated scope.
- Crawls and webhooks must be idempotent and retry-safe.
- Historical snapshots are immutable; corrections require a new snapshot or version.
- Secrets must never enter logs, documentation, or snapshots.

## Open decisions

- Modular monolith versus a separate worker process
- ORM and migration tooling
- Queue, cache, and object storage
- BYOK credential storage
- Free MVP observability

[Persian version](overview.fa.md)
