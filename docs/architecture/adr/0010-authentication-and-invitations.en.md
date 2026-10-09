---
title: ADR-0010 Authentication and Invitations
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0010: Mobile/Password, OTP, and Multi-channel Invitations

## Context and problem
The target market is Iran and mobile is the primary identifier, while organization invitations may use mobile, email, or links.

## Decision drivers
- Familiar Iranian user experience
- Invite before registration
- Zero external-tool fees in the MVP
- Future SMS-provider integration

## Considered options
1. Email and password only
2. OTP only
3. Mobile and password or OTP with verified contacts

## Decision
Design sign-in for mobile/password or OTP. A development provider logs OTP codes; public beta OTP stays disabled until SMS is integrated. Invitations may bind to mobile, verified email, or a constrained link.

## Positive consequences
- Clear migration path to an SMS provider
- Flexible invitations
- Contact verification remains separate from the account

## Negative consequences and risks
- Real OTP is unavailable in public beta without a provider.
- Mobile and email normalization must be correct.
- Invite links require rate limits and expiry.

## Review trigger
Before enabling SMS or OAuth.

[Persian version](0010-authentication-and-invitations.fa.md)
