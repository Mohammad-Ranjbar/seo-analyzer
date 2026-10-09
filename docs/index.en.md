---
title: SEO Analyzer Documentation Guide
lang: en
status: active
updated: 2026-10-09
---

# Persian SEO Analyzer Documentation

This directory is the version-controlled source of truth and the project's Obsidian vault. Persian and English versions use separate files with the same base name and a language suffix.

## Reading order

1. [Business plan](business/business-plan.en.md)
2. [Product requirements](product/prd.en.md)
3. [Glossary](product/glossary.en.md)
4. [Architecture overview](architecture/overview.en.md)
5. [Conceptual database model](database/conceptual-model.en.md)
6. [Data dictionary](database/data-dictionary.en.md)
7. [ERD and drawDB artifact guide](database/README.en.md)
8. [Design approval checklist](review/design-approval-checklist.en.md)
9. [Architecture decisions](architecture/adr/README.en.md)
10. [Public API contract](api/contract.en.md)

## Document states

- `approved`: the product owner approved the scope or model.
- `accepted`: an ADR is accepted and binding.
- `draft`: the document still requires review and approval.
- `superseded`: a later ADR replaced the decision.

## Maintenance rules

- Persian and English files must remain semantically aligned.
- drawDB is a visualization tool; the model and decisions must also be documented in Markdown.
- Important architectural changes require a new ADR.
- This vault must not contain secrets, tokens, real customer data, or complete crawled HTML.

[Persian version](index.fa.md)
