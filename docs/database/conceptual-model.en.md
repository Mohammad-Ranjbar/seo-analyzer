---
title: Conceptual Database Model
lang: en
status: approved
version: 0.1
updated: 2026-10-09
---

# PostgreSQL Conceptual Model

## Principles

- Shared schema with row-level security
- Organization is the primary tenant boundary; workspace is the operational authorization boundary.
- Important historical data is versioned or append-only.
- Complete page HTML is not stored.
- Timestamps use UTC; schedules preserve a timezone.
- Secrets are hashed or encrypted.

## Identity and tenancy

`users` stores the primary account. `user_contacts` separates normalized, verifiable mobile and email contacts. `organization_memberships` carries the fixed owner/admin/member role, while `workspace_members` grants workspace access.

## RBAC

`permissions` is the system resource/action catalog. Administrators create `workspace_roles` and assign catalog permissions through `workspace_role_permissions`. `workspace_member_roles` assigns roles to members.

## Projects and websites

Each `seo_project` belongs to a workspace and owns one structured `project_scope`. `web_properties` models the primary domain, owner subdomains, and competitor properties. `competitors` represents a competing business, and `competitor_suggestions` records suggestion and approval lifecycle.

## Crawling

`crawl_schedules` stores manual, weekly, or monthly scheduling. `crawl_runs` represents an independent execution. `crawl_pages` provides stable URL identity, while `crawl_page_snapshots` stores extracted data for each run. `page_type_overrides` preserves user corrections for product and category detection.

## Analysis

`audit_rules` identifies a rule, and `audit_rule_versions` preserves immutable logic versions. `audit_findings` records evaluations. `score_model_versions` stores weights, while `score_snapshots` stores comparable results. `competitor_comparisons` records site-level comparison only.

## Action tracking

`action_items` stores user-managed task state. `action_item_status_history` audits changes, and `action_item_verifications` records independent technical results from later crawls.

## Products and SEO generation

`products` may originate from the API or crawling. `product_sources` records origin and external identifiers. `categories` is hierarchical and relates many-to-many with products. `seo_generation_versions` retains every output and its accepted, rejected, or applied decision.

## API and operations

`api_keys` belongs to a workspace and is constrained by permission and project-scope tables. `webhook_deliveries` records every delivery attempt. `usage_events` is the usage source of truth, with `usage_daily_summaries` for reporting. `audit_logs` records important actions, and `deletion_requests` coordinates permanent purges.

## Key constraints

- A verified contact is unique within its contact type.
- An organization has exactly one active owner or a valid ownership-transfer process.
- Duplicate memberships are forbidden.
- Canonical URLs are unique per property.
- A product has at most one primary category.
- Used rule and score versions are immutable.
- Raw API keys and OTP codes are never stored.

[Persian version](conceptual-model.fa.md)
