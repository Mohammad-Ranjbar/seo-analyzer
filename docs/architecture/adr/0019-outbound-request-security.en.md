---
title: ADR 0019 - Outbound request and crawler security
lang: en
status: accepted
updated: 2026-10-09
---

# ADR 0019 — Outbound request and crawler security

## Decision

Only HTTP and HTTPS are accepted for crawl targets; HTTPS is required for webhooks. Resolve every hostname before connecting and reject loopback, private, link-local, multicast, unspecified, carrier-grade NAT, metadata, and other non-public addresses for both IPv4 and IPv6. Connect only to a validated resolved address while preserving TLS hostname verification. Revalidate every redirect and cap redirects at five.

Honor robots.txt, use an identifiable user agent, apply per-host concurrency and delay, cap response bytes and decompression, validate content type, and set connect/headers/body deadlines. HTML is fetched first; headless rendering is allowed only after a bounded eligibility check and has a separate page budget. Webhook destinations use the same SSRF controls.

## Consequences

- DNS rebinding and redirect pivots are treated as first-class threats.
- Crawler limits cannot be weakened by tenant input beyond administrator caps.
- Network-policy egress allow-listing is an additional deployment control, not a substitute for application validation.

[Persian version](0019-outbound-request-security.fa.md)
