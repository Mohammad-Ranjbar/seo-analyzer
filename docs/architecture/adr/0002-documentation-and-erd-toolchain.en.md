---
title: ADR-0002 Documentation and ERD Toolchain
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0002: Obsidian and drawDB

## Context and problem
Documentation must be bilingual, versionable, and independent from a paid service. The ERD must be editable in a browser.

## Decision drivers
- Zero-cost MVP
- Open, Git-friendly formats
- Offline work and data ownership
- Reviewable visual output

## Considered options
1. Markdown in a local Obsidian vault and free drawDB
2. A paid cloud documentation service
3. Proprietary binary files

## Decision
`docs/` is a local Obsidian-compatible vault. Every document has separate Persian and English files. The ERD is maintained in drawDB, and its open DBML and JSON source artifacts are stored in the repository. A visual export is stored only when its size is reasonable for version control.

## Positive consequences
- Documentation remains readable without a specific tool.
- Ownership and history stay in the repository.
- Tools remain replaceable.

## Negative consequences and risks
- There is no automatic Obsidian sync.
- The local drawDB document must be exported after approved changes.
- Visual exports of large models can be excessive and must not enter Git without a size check.
- Translations may drift.

## Review trigger
When a team joins or real-time collaboration becomes necessary.

[Persian version](0002-documentation-and-erd-toolchain.fa.md)
