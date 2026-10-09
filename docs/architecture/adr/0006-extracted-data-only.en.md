---
title: ADR-0006 Store Extracted Data Only
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0006: Do Not Store Complete HTML

## Context and problem
Storing complete HTML increases cost, legal exposure, and sensitive-data surface, while comparison needs a bounded set of fields.

## Decision drivers
- Data minimization
- Lower storage cost
- Reduced risk around competitor content
- Historical comparison capability

## Considered options
1. Store complete HTML
2. Store HTML temporarily
3. Store extracted data and fingerprints

## Decision
Store metadata, headings, required structured data, link/image metrics, status, and fingerprints. Do not store complete HTML.

## Positive consequences
- Lower storage and risk surface
- Simpler deletion
- Smaller snapshots

## Negative consequences and risks
- Some parser defects are harder to debug without recrawling.
- A field that was not extracted historically cannot be recovered.

## Controls
- Record parser and rule versions.
- Use synthetic fixtures for parser testing.

## Review trigger
Only after a demonstrated need and with a bounded retention policy.

[Persian version](0006-extracted-data-only.fa.md)
