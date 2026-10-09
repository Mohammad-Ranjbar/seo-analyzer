---
title: ADR-0011 HTML-first with Headless Fallback
lang: en
status: accepted
date: 2026-10-09
---

# ADR-0011: HTML-first with Headless Fallback

## Context and problem
Browser rendering is expensive, but some stores expose product content only through JavaScript.

## Decision drivers
- Low resource use
- Coverage for JavaScript-heavy sites
- Predictable behavior
- Administrator-controlled MVP limits

## Considered options
1. HTTP HTML only
2. Headless rendering for every page
3. Initial HTML with conditional fallback

## Decision
Analyze response HTML first. If required signals are absent and limits permit, render the same URL with a headless browser. Record the fallback reason.

## Positive consequences
- Most pages are processed cheaply.
- Dynamic-site coverage remains possible.

## Negative consequences and risks
- Fallback detection may be wrong.
- Browser workers add attack surface and resource use.

## Review trigger
After measuring fallback rate and real cost.

[Persian version](0011-html-first-headless-fallback.fa.md)
