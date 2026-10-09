---
title: Database ERD and Artifact Guide
lang: en
status: approved
updated: 2026-10-09
---

# Database ERD

The approved PostgreSQL model is stored in drawDB as **Persian SEO Analyzer — Conceptual MVP**.

## Online diagram

- [Open the ERD in drawDB](https://drawdb.app/editor/diagrams/e3609f8c-bfec-4a15-85e6-2513c84e882b)
- Last verified state: 54 tables, 91 relationships, and zero problems

Access to the online version depends on the project owner's drawDB account. This link does not replace the version-controlled repository artifacts.

## Maintainable artifacts

- [DBML model](seo-analyzer.dbml): diffable text source and the canonical conceptual structure
- [drawDB-compatible JSON export](seo-analyzer.drawdb.json): importable recovery and editing artifact
- [Conceptual model](conceptual-model.en.md): rationale for domain and aggregate boundaries
- [Data dictionary](data-dictionary.en.md): responsibilities and rules for each data group

The complete drawDB SVG export was approximately 206 MB, so it was not added to the repository. This is a visual-export limitation and does not affect the completeness of the DBML, JSON, or online diagram.

## Conceptual and physical boundaries

The DBML and drawDB files remain the approved conceptual view. The executable physical model is the [Prisma contract](../../src/prisma/contract.prisma), with its immutable snapshot and initial migration under `migrations/`. The physical model adds operational idempotency storage, enforceable status/check constraints, composite tenant foreign keys, forced RLS, runtime roles, and transaction-scoped context functions.

The initial migration has been applied to an empty PostgreSQL database, strictly verified against the emitted contract, and exercised with positive and negative tenant-isolation tests.

[Persian version](README.fa.md)
