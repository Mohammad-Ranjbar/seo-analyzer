---
title: Product Requirements Document
lang: en
status: approved
version: 1.0
updated: 2026-10-09
---

# PRD — Persian SEO Analyzer

## Objective

Build a secure multi-tenant API for recurring SEO analysis of Persian commerce product and category pages, measuring progress against a baseline and approved competitors.

## Users

- Organization owners and administrators
- Organization members
- Workspace managers
- Workspace members with custom roles
- Machine clients using API keys
- System administrators managing beta access

## Primary journey

1. A user registers with a mobile number and password.
2. They create an organization or accept a mobile, email, or link invitation.
3. They create a workspace and custom roles.
4. They define an SEO project and structured scope.
5. They add a primary domain and properties.
6. They submit or request competitor suggestions and approve them.
7. They run a manual or scheduled crawl.
8. They review findings, component scores, and the action plan.
9. They update action-item status.
10. A later crawl records technical verification and progress.

## Functional requirements

### Identity and membership

- Sign in with mobile and password or OTP. The development OTP provider logs codes; public beta OTP remains disabled until SMS exists.
- A user may belong to multiple organizations.
- Organization roles are fixed; workspace roles are custom.
- Invitations support mobile, email, or constrained links.

### Scope and properties

- A site URL is optional when creating a project but required for a baseline.
- Each project has one primary domain and multiple properties.
- A competitor may own multiple domains and subdomains.
- Suggested competitors are not analytically stored or crawled before approval.

### Crawling

- Respect robots.txt, identify the crawler, rate-limit, back off, and enforce administrator-defined limits.
- Analyze only product and category pages.
- Detect page type automatically with user overrides.
- Use initial HTML by default and headless rendering as a fallback.
- Always expose polling and optionally deliver signed webhooks.

### Analysis and progress

- The first successful crawl becomes the baseline.
- Report normalized ratios and explainable component scores.
- MVP comparison is site-level, not product-to-product matching.
- Rules and scoring formulas are versioned.
- User task state and technical verification are independent.

### SEO generation

- Base input: title, category, and optional brand.
- Output: SEO title, meta description, keywords, and slug.
- Products may originate from the API or owner-site crawling.
- Preserve every version and its accepted, rejected, or applied decision.

### Deletion and history

- Keep history until the user requests deletion.
- Delete softly first, then purge after a configurable recovery window.
- Never store full page HTML.

## Non-functional requirements

- Shared-schema tenancy with PostgreSQL RLS
- API versioning, DTO validation, and OpenAPI
- Hashed or encrypted secrets and tokens
- Queues for crawls and webhook delivery
- Idempotency for retryable operations
- Audit logging for important actions
- Unit, integration, end-to-end, and negative cross-tenant access tests

## Out of MVP scope

- Billing and subscriptions
- Product-to-product competitor matching
- Blog and general-page analysis
- Search Console and real keyword positions
- Field Core Web Vitals
- A complete non-technical dashboard
- User-provided cron expressions

## MVP acceptance criteria

- A user can create an organization, workspace, project scope, and primary property without seeing another tenant's data.
- A baseline crawl can be queued, processed within approved safety limits, and observed through polling.
- A successful crawl produces version-bound findings, component scores, and action items using extracted data only.
- A later crawl preserves history and records action-item verification independently from user workflow state.
- API imports and retryable writes are idempotent; signed webhook delivery is replay-safe and eventually reaches a terminal state.
- Password, session, OTP, API-key, RLS, SSRF, retention, and hard-limit policies match the accepted ADRs.

Local-AI/BYOK provider details and final catalog contents are additive integration work and do not change these acceptance criteria.

[Persian version](prd.fa.md)
