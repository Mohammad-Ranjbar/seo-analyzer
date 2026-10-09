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

## Current boundary

This model is documentation for design approval. It is not SQL, a migration, or executable application code. Physical-model implementation requires separate approval.

[Persian version](README.fa.md)
