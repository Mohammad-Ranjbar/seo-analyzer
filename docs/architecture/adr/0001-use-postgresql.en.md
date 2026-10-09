---
title: ADR-0001 Use PostgreSQL
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0001: Use PostgreSQL

## Context and problem
The product needs transactions, complex relationships, history, constrained JSON use, rich indexing, and row-level tenant isolation.

## Decision drivers
- Native RLS
- Strong constraints and transactions
- Analytical queries and diverse indexes
- Mature open-source tooling

## Considered options
1. PostgreSQL
2. MySQL/MariaDB
3. A document database

## Decision
PostgreSQL is the primary database.

## Positive consequences
- Native RLS and an appropriate relational model
- JSONB for limited flexible data
- Room for analytical reporting

## Negative consequences and risks
- RLS and indexing require expertise and testing.
- Excessive JSONB use could obscure the model.

## Review trigger
Before selecting an ORM or when evidence establishes a need for another database.

[Persian version](0001-use-postgresql.fa.md)
