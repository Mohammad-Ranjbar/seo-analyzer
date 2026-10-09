---
title: ADR-0007 Rules-first Core and Optional AI
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0007: Rules-first Core and Optional AI

## Context and problem
The MVP must not depend on a paid AI service, although competitor suggestions and text generation may benefit from AI.

## Decision drivers
- Zero external-tool fees
- Explainable, reproducible output
- Audit remains functional without AI
- Local-model and BYOK support

## Considered options
1. Mandatory AI
2. No AI
3. A rules-first core with optional AI

## Decision
Core audits, scoring, and action plans work without AI. AI is an optional adapter for suggestions or generation, using a local model or user-owned credentials.

## Positive consequences
- Lower vendor lock-in
- Testable and cost-controlled behavior
- AI outages do not disable core analysis

## Negative consequences and risks
- Non-AI templates have a lower quality ceiling.
- BYOK requires secure credential storage.

## Review trigger
After a Persian benchmark and real cost/quality data exist.

[Persian version](0007-rules-first-optional-ai.fa.md)
