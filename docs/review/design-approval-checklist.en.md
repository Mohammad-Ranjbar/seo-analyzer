---
title: Design Approval Checklist
lang: en
status: active
updated: 2026-10-09
---

# Design Approval Checklist

This document is the implementation gate. No migration, ORM model, or executable endpoint is created until the “before coding” items are approved.

## Current state

| Area | Reference | Status | Outcome |
|---|---|---|---|
| Business model | [Business plan](../business/business-plan.en.md) | Approved | MVP scope and free model are defined |
| Conceptual database model | [Conceptual model](../database/conceptual-model.en.md) | Approved | 54 tables and 91 relationships are recorded in drawDB with zero problems |
| Architecture decisions | [ADR index](../architecture/adr/README.en.md) | Accepted | Twelve foundation decisions are recorded |
| Product requirements | [PRD](../product/prd.en.md) | Draft | Scenarios and acceptance criteria need review |
| Architecture overview | [Overview](../architecture/overview.en.md) | Draft | Module boundaries depend on the remaining technical decisions |
| Data dictionary | [Data dictionary](../database/data-dictionary.en.md) | Draft | Exact constraints and lifecycles are not final |

## Required before coding

- [ ] Approve primary scenarios and PRD acceptance criteria.
- [ ] Define lifecycles and allowed values for primary statuses.
- [ ] Approve uniqueness, nullability, and deletion constraints for the physical model.
- [ ] Define exact RLS policies and tenant-context handling.
- [ ] Select the ORM and migration-management approach and record an ADR.
- [ ] Approve API versioning, error format, pagination, and idempotency contracts.
- [ ] Select the crawl job, queue, and retry architecture.
- [ ] Finalize SSRF, robots, rate-limit, and headless-fallback security policies.
- [ ] Define session, access/refresh token, password hashing, and OTP limits.
- [ ] Approve default crawl and data-retention limits.

## Required before public beta

- [ ] Enable a real SMS provider and disable OTP logging.
- [ ] Test webhook signing, rotation, retries, and replay protection.
- [ ] Define logging, metrics, tracing, and alerting.
- [ ] Test backup, restore, purge, and data-deletion requests.
- [ ] Validate RLS through tenant-isolation and administrative-path tests.
- [ ] Validate usage limits and reporting for 100 beta users.

## Status transition rule

A document moves from `draft` to `approved` only after explicit product-owner approval. A new architecture decision or a change to an accepted decision requires a new ADR; editorial corrections do not.

[Persian version](design-approval-checklist.fa.md)
