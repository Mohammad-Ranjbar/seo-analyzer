---
title: ADR-0012 Meter Usage Before Billing
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0012: Usage Metering without MVP Billing

## Context and problem
The future business model depends on usage, but price and true operating cost are not yet validated.

## Decision drivers
- Learn real cost
- Avoid premature payment design
- Enforce administrator limits
- Gather data for future plans

## Considered options
1. Full billing from the start
2. No usage recording
3. Usage events and summaries without payment

## Decision
The MVP records immutable usage events and rebuildable daily summaries. It does not implement subscriptions, invoices, payments, or credit balances.

## Positive consequences
- Real pricing evidence
- Smaller scope and lower financial risk
- Limits for crawls, pages, headless rendering, and AI

## Negative consequences and risks
- Converting usage to billing later requires migration work.
- Event duplication requires idempotency.

## Review trigger
After reliable beta data exists and before the first paid plan.

[Persian version](0012-usage-metering-before-billing.fa.md)
