---
title: ADR-0004 Workspace RBAC
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0004: Custom Roles with a Permission Catalog

## Context and problem
Organizations have fixed owner/admin/member roles, while each workspace needs roles tailored to its operation.

## Decision drivers
- Understandable administration
- Testable enforcement
- No meaningless free-text permissions
- Independent workspace scope

## Considered options
1. Fixed roles at every level
2. Free-form permissions and a dynamic policy engine
3. A system permission catalog with custom roles

## Decision
The system defines resource/action permissions. Workspace administrators create named roles and combine catalog permissions. Membership and role assignment are independent per workspace.

## Positive consequences
- Useful flexibility without a complex rule DSL
- Auditable and testable access matrices
- API keys can reuse the same permission catalog.

## Negative consequences and risks
- New permission behavior requires a software change.
- Editing a role can change access for many members at once.

## Review trigger
When evidence establishes a real need for attribute-based policies.

[Persian version](0004-workspace-rbac.fa.md)
