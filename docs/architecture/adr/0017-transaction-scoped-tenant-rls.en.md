---
title: ADR 0017 - Transaction-scoped tenant context and forced RLS
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0017 — Transaction-scoped tenant context and forced RLS

## Decision

Every application request and worker job that touches tenant data runs in a database transaction. It first calls one security-definer context function for an authenticated user, API key, or worker. The function validates active membership or key state, then sets transaction-local organization, workspace, user, and API-key identifiers.

Tenant tables use enabled and forced PostgreSQL RLS. Organization and workspace policies are combined, with workspace checks restrictive. Runtime roles are `NOLOGIN`, `NOBYPASSRLS`, and separate application, authentication, and worker duties. No-context access is default-deny.

## Consequences

- Connection-pool reuse cannot leak context because settings are transaction-local.
- Table owners and migration users are never used by the running service.
- CI includes no-context, cross-tenant context, cross-tenant write, and mismatched composite-key tests.

[Persian version](0017-transaction-scoped-tenant-rls.fa.md)
