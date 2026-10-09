---
title: ADR 0020 - Authentication and session security
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0020 — Authentication and session security

## Decision

Hash passwords with Argon2id using at least 19 MiB memory, 2 iterations, and parallelism 1; parameters are encoded with each hash and may be raised after production benchmarking. Access tokens are short-lived (15 minutes). Opaque refresh tokens are random, stored only as hashes, rotated on every use, and revoked as a family on replay; sessions expire after 30 days of inactivity and 90 days absolute.

OTP codes are six digits, expire after 5 minutes, are single-use, and allow at most 5 verification attempts. Sending is limited per contact, IP, and purpose with increasing cooldown. Password and OTP failure messages do not reveal account existence. Public beta cannot enable OTP until a real provider is configured and code logging is disabled.

## Consequences

- Authentication data is handled by the dedicated auth database role.
- Password reset, contact verification, and sign-in challenges are purpose-bound.
- Token and OTP secrets never appear in application logs or durable events.

[Persian version](0020-authentication-security.fa.md)
