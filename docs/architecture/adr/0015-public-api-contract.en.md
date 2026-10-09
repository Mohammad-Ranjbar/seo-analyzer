---
title: ADR-0015 Public HTTP API Contract
lang: en
status: accepted
date: 2026-10-09
deciders:
  - Product owner
  - Engineering
---

# ADR-0015: Public HTTP API Contract

## Context and problem statement

The API needs stable rules for version selection, errors, collection traversal, and safe retries
before business endpoints are implemented. These rules must work for machine clients without
forcing domain models or database migrations before their constraints and RLS policies are
approved.

## Decision drivers

- Explicit, machine-readable contracts
- Predictable retry behavior for long-running and create operations
- Stable traversal while rows may be inserted concurrently
- Small and framework-compatible MVP surface
- No dependency on an unapproved physical database model

## Decision outcome

Use the contract defined in [Public API contract](../../api/contract.en.md):

- Header versioning with the required `API-Version: 1` header
- A version-neutral `GET /api/health` operational endpoint
- RFC 9457 Problem Details with stable project error codes
- Opaque forward cursor pagination, with a default page size of 25 and maximum of 100
- `Idempotency-Key` on explicitly documented retryable mutation endpoints, scoped to the caller
  and operation, with a request fingerprint and a minimum 24-hour retention period

The version gate, request identifier, Problem Details serializer, operational health behavior,
pagination primitives, and idempotency validation/fingerprinting are implemented now. Endpoint
integration becomes executable with each approved business contract. Idempotency persistence is
blocked until its physical constraints, tenant scoping, transaction boundary, and RLS policy are
approved.

## Consequences

### Positive

- Clients receive explicit errors instead of framework-specific response shapes.
- Cursor pagination avoids duplicate and skipped-row behavior common with mutable offset pages.
- Retried mutations can return the original result without repeating a completed side effect.
- Database work remains behind the existing design gate.

### Negative

- Header versioning is less visible during manual browsing than URI versioning.
- Exact pagination totals are not available by default.
- Idempotency requires durable storage and careful transaction design before business endpoints ship.
- The IETF `Idempotency-Key` document used as design input is an expired Internet-Draft, not an RFC.

## Validation and compliance

- Every public business controller explicitly declares version `1`.
- Missing or malformed API versions return `400`; unsupported numeric versions return `406`.
- Every 4xx and 5xx API response uses `application/problem+json`.
- Pagination cursors are opaque, integrity-protected, and bound to the effective query scope.
- An idempotency key cannot be reused for a different request fingerprint.
- No in-memory-only idempotency implementation is allowed in a shared or production environment.

## Review trigger

Review when version `2` is proposed, bidirectional pagination or exact totals become necessary, the
IETF Idempotency-Key work is replaced or published as an RFC, or before implementing idempotency
storage.

[Persian version](0015-public-api-contract.fa.md)
