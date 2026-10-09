---
title: ADR-0009 Version Rules and Scores
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0009: Version Rules and Score Models

## Context and problem
Changing a rule or score weight can move a historical trend without any real website change.

## Decision drivers
- Fair comparison over time
- Reproducible reports
- Explainable score changes
- Gradual rollout of a new model

## Considered options
1. Edit rules and weights in place
2. Copy formulas into each snapshot
3. Immutable rule and score-model versions

## Decision
Every crawl references the exact rule and score-model versions it used. Used versions are immutable; changes create new version records.

## Positive consequences
- Auditing and reproduction are possible.
- Trend charts remain interpretable.

## Negative consequences and risks
- More records and query complexity
- Cross-version comparisons require warnings or recalculation.

## Review trigger
After the first real score model is designed.

[Persian version](0009-versioned-rules-and-scores.fa.md)
