---
title: ADR-0008 Polling and Signed Webhooks
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0008: Polling with Signed Webhooks

## Context and problem
Crawling is asynchronous, and API clients need a reliable way to receive status and completion.

## Decision drivers
- A simple always-available path
- Optional push notification
- Retries and idempotency
- Payload authenticity

## Considered options
1. Polling only
2. Webhooks only
3. Polling plus signed webhooks

## Decision
Polling is the authoritative status path. A workspace may configure webhook endpoints. Payloads include a signature, delivery ID, and bounded retries.

## Positive consequences
- Clients can recover results even after webhook failure.
- Event-driven integration remains possible.

## Negative consequences and risks
- Webhook delivery requires additional state and queueing.
- SSRF and replay attacks must be controlled.

## Controls
- URL validation, redirect limits, and private-network blocking
- Timestamps, signatures, and idempotency keys

## Review trigger
When an event bus or formal SLA is introduced.

[Persian version](0008-polling-and-signed-webhooks.fa.md)
