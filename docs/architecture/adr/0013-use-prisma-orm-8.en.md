---
title: ADR-0013 Use Prisma ORM 8
lang: en
status: accepted
date: 2026-10-09
deciders:
  - Product owner
  - Engineering
---

# ADR-0013: Use Prisma ORM 8 with Reviewed PostgreSQL Migrations

## Context and problem statement

The application needs a type-safe data-access layer for a large PostgreSQL model while preserving database-level controls such as Row-Level Security, check constraints, partial indexes, and explicit tenant context. The ORM must not become the source of truth for security behavior that PostgreSQL must enforce.

Prisma 8 introduces a contract-based ORM workflow. At the time of this decision, Prisma 8 and `@prisma/orm-postgres` are release candidates rather than generally available releases. The physical model and RLS details were intentionally deferred here and were subsequently accepted in ADR 0016 and ADR 0017.

## Decision drivers

- Type-safe queries and editor support for a TypeScript/NestJS codebase
- A PostgreSQL-first workflow that can preserve reviewed native SQL
- Explicit, version-controlled migrations instead of runtime schema synchronization
- A clear boundary between application authorization and PostgreSQL RLS
- A maintainable developer experience for a small initial team
- No mandatory paid Prisma service or hosted database dependency

## Considered options

1. Prisma ORM 8 with PostgreSQL contracts and reviewed migrations
2. Drizzle ORM with SQL migrations
3. TypeORM with generated migrations
4. PostgreSQL driver and handwritten SQL only

## Decision outcome

Use Prisma ORM 8 and `@prisma/orm-postgres` for typed application data access.

- Keep the Prisma contract and emitted artifacts in version control.
- Add the physical contract incrementally only after its constraints and lifecycles are approved.
- Generate migration candidates locally, then review and amend their SQL before application.
- Express RLS policies, tenant-context functions, specialized indexes, and unsupported PostgreSQL features in reviewed SQL migrations.
- Do not use schema push or automatic synchronization in shared, staging, or production environments.
- Do not require Prisma Postgres, Prisma Console, or another paid Prisma service.
- Keep the Prisma 8 release-candidate versions pinned exactly until a stable upgrade is reviewed.
- Do not approve public beta deployment until Prisma 8 stability and dependency advisories have been reassessed.

## Consequences

### Positive

- Application queries gain generated types without replacing PostgreSQL security controls.
- Contract and migration changes remain reviewable in Git.
- The project retains access to native PostgreSQL features needed by the tenancy model.
- The initial team gets a consistent query API and a smaller amount of handwritten mapping code.

### Negative

- Prisma 8 release-candidate APIs and artifacts may change before general availability.
- Some database features require handwritten SQL and cannot be represented only in the Prisma contract.
- Generated migration output is not sufficient evidence that RLS and tenant isolation are correct.
- The current release-candidate CLI dependency tree contains development-tool advisories, although the production dependency audit is clean.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Release-candidate breaking change | Pin exact versions and upgrade only through a reviewed change |
| ORM query bypasses tenant assumptions | Set tenant context per transaction and verify isolation with integration tests |
| Migration loses a native PostgreSQL feature | Review the SQL diff and keep custom SQL in the migration |
| Generated files drift from the source contract | Regenerate in CI and fail when the working tree changes |
| Tooling advisories reach runtime code | Audit production dependencies separately and block release on relevant runtime findings |

## Validation and compliance

- `npm run contract:emit` must succeed after each contract change.
- Generated contract artifacts must match the committed source contract.
- Every production migration requires human review.
- RLS policies require positive and negative tenant-isolation tests before release.
- Production code must not use administrative database credentials for normal requests or jobs.

## Review trigger

Review this decision when Prisma 8 reaches general availability, before the first physical migration is applied to a shared environment, before public beta, or if PostgreSQL/RLS requirements cannot be represented safely.

[Persian version](0013-use-prisma-orm-8.fa.md)
