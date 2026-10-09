---
title: ADR-0003 Shared Schema with RLS
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0003: Shared Schema with PostgreSQL RLS

## Context and problem
The product is multi-tenant, and data leakage between organizations or workspaces is unacceptable.

## Decision drivers
- Defensible isolation
- Lower operational complexity than per-tenant schemas or databases
- Shared queries and migrations
- Automated negative-access testing

## Considered options
1. Shared schema with application checks
2. Shared schema with both RLS and application checks
3. A schema per organization

## Decision
All tenants share one schema. Tenant columns exist on relevant tables, and both application authorization and RLS restrict access.

## Positive consequences
- Defense in depth against unscoped queries
- Simpler migrations and reporting
- Appropriate MVP operational cost

## Negative consequences and risks
- Request and job context must reach every connection.
- Incorrect policies can overexpose or overrestrict data.
- System-administrator operations need an explicit audited path.

## Controls
- Cross-tenant tests for every repository
- No ordinary runtime connection with `BYPASSRLS`
- Tenant-prefixed indexes for common access paths

## Review trigger
After real scale evidence or a contractual physical-isolation requirement.

[Persian version](0003-shared-schema-with-rls.fa.md)
