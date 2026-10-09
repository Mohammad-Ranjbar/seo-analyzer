---
title: ADR 0016 - Physical data model and lifecycles
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0016 — Physical data model and lifecycles

## Decision

Use the emitted Prisma 8 contract and reviewed migration package as the executable physical model. PostgreSQL check constraints enforce bounded status values, counters, score ranges, time ordering, and conditional nullability. Composite foreign keys bind tenant-owned records to their organization, workspace, and project. Security-scoping keys are repeated on junction tables so RLS can evaluate them without application joins.

Application-generated UUIDs are used; timestamps are supplied by the application unless a database default is explicitly present. Soft-deletable owners progress through active/archived or deleting states before `deleted`; terminal execution records require a completion timestamp. Deletion requests retain a recovery window before purge.

## Consequences

- The conceptual ERD remains the domain view; the Prisma contract is the deployable source of truth.
- State transitions still require service-level authorization, while the database rejects structurally invalid end states.
- Every contract change requires an inspected migration and a clean-database apply/verify test.

[Persian version](0016-physical-data-model-and-lifecycles.fa.md)
