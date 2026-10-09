---
title: ADR-0014 Use Biome for Static Checks and Formatting
lang: en
status: accepted
date: 2026-10-09
deciders:
  - Product owner
  - Engineering
---

# ADR-0014: Use Biome for Static Checks and Formatting

## Context and problem statement

The starter repository used separate Prettier and oxlint configurations. A small team benefits from one fast, deterministic tool with a single configuration and a single local/CI check.

## Decision drivers

- One source of truth for formatting and lint rules
- Fast local feedback and straightforward CI integration
- First-class TypeScript support
- Minimal configuration and dependency surface
- Reproducible output across developer machines

## Considered options

1. Biome for formatting, linting, and import organization
2. Prettier plus ESLint
3. Prettier plus oxlint
4. Separate formatter and linter selected per package

## Decision outcome

Use Biome as the only formatter, linter, and import organizer.

- Pin Biome to an exact version.
- Use `npm run check` as the non-mutating local and CI quality gate.
- Keep `npm run lint` and `npm run format` as focused convenience commands.
- Use `npm run check:write` for explicit automatic fixes.
- Remove Prettier, oxlint, and their configuration files.
- Exclude generated Prisma contract artifacts from Biome processing.

## Consequences

### Positive

- One configuration controls the code-quality workflow.
- Local and CI behavior are easier to reproduce.
- Fewer overlapping rules and dependencies need maintenance.

### Negative

- Rules without a Biome equivalent may require a different validation mechanism.
- Version upgrades can introduce formatter changes across many files.
- Framework-specific checks still require TypeScript, Nest, or dedicated tests.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| An important rule is unavailable | Add a focused compiler/test check instead of a second general linter |
| Upgrade creates a large diff | Pin the version and upgrade in a dedicated change |
| Generated files create noise | Exclude generated artifacts and verify their generation separately |

## Validation and compliance

- `npm run check` must pass without modifying files.
- `npm run build`, unit tests, and end-to-end tests remain independent required checks.
- Biome upgrades must include a clean formatting diff and successful test suite.

## Review trigger

Review when Biome no longer supports the project TypeScript/NestJS syntax, when a required security or correctness rule cannot be enforced, or during a major Biome upgrade.

[Persian version](0014-use-biome.fa.md)
