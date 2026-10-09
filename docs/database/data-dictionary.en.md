---
title: Data Dictionary
lang: en
status: approved
updated: 2026-10-09
---

# Data Dictionary

This document defines table-level responsibilities. Exact columns, constraints, indexes, relationships, and RLS policies are executable in the [Prisma contract](../../src/prisma/contract.prisma) and its reviewed migration package.

| Group | Table | Responsibility |
|---|---|---|
| Identity | `users` | Account, status, and base profile |
| Identity | `user_contacts` | Normalized, primary, and verified mobile/email contacts |
| Identity | `user_credentials` | Password hash and credential rotation metadata |
| Identity | `otp_challenges` | OTP hash, purpose, expiry, and attempt count |
| Identity | `auth_sessions` | Refresh sessions, devices, and revocation |
| Tenancy | `organizations` | Primary tenant and base settings |
| Tenancy | `organization_memberships` | Member and fixed organization role |
| Tenancy | `organization_invitations` | Mobile, email, or link invitation |
| Tenancy | `workspaces` | Organization workspace |
| Access | `workspace_members` | Selective organization-member workspace access |
| Access | `permissions` | Fixed resource/action catalog |
| Access | `workspace_roles` | Custom workspace role |
| Access | `workspace_role_permissions` | Role permission assignments |
| Access | `workspace_member_roles` | Workspace member role assignments |
| Projects | `seo_projects` | SEO project aggregate |
| Projects | `project_scopes` | Structured project-scope answers |
| Projects | `project_scope_categories` | Project target categories |
| Projects | `competitors` | Approved or archived competitor |
| Projects | `competitor_suggestions` | Suggestion evidence and user decision |
| Projects | `web_properties` | Owner or competitor domain/subdomain |
| Crawl | `crawl_configurations` | Property limits, rates, depths, and behavior |
| Crawl | `crawl_schedules` | Weekly or monthly schedule |
| Crawl | `crawl_runs` | Crawl execution, status, and metrics |
| Crawl | `crawl_pages` | Stable property URL identity |
| Crawl | `crawl_page_snapshots` | Extracted page data for a run |
| Crawl | `crawl_links` | Discovered links between pages |
| Crawl | `page_type_overrides` | Product/category detection correction |
| Analysis | `audit_rules` | Stable rule identity |
| Analysis | `audit_rule_versions` | Versioned rule logic and parameters |
| Analysis | `audit_findings` | Rule result with severity and evidence |
| Analysis | `score_model_versions` | Scoring weights and formulas |
| Analysis | `score_snapshots` | Component scores over time |
| Analysis | `competitor_comparisons` | Site-level competitor comparison |
| Actions | `action_items` | Suggested task and user state |
| Actions | `action_item_status_history` | Task-state history |
| Actions | `action_item_verifications` | Later crawl's technical result |
| Catalog | `brands` | Optional product brand |
| Catalog | `categories` | Hierarchical category |
| Catalog | `products` | Canonical project product |
| Catalog | `product_categories` | Many-to-many and primary category |
| Catalog | `product_sources` | API/crawl origin, URL, and external ID |
| Generation | `seo_generation_runs` | Generation request and context |
| Generation | `seo_generation_versions` | Title, meta, slug, and user decision |
| Generation | `seo_generation_keywords` | Ordered version keywords |
| API | `api_keys` | Workspace key hash and metadata |
| API | `api_key_permissions` | Key permissions |
| API | `api_key_project_scopes` | Key project scopes |
| API | `idempotency_records` | Request fingerprint, lock, and replayable response retained for 24 hours |
| Webhook | `webhook_endpoints` | URL, encrypted secret, and state |
| Webhook | `webhook_deliveries` | Delivery attempts, responses, and retries |
| Governance | `usage_events` | Immutable usage event |
| Governance | `usage_daily_summaries` | Rebuildable daily rollup |
| Governance | `audit_logs` | Important actions and actor/target |
| Governance | `waitlist_entries` | Beta access request and decision |
| Governance | `deletion_requests` | Recovery window and permanent purge |

## Naming conventions

- Tables and columns: `snake_case`
- Primary keys: `id`
- Foreign keys: `<entity>_id`
- Timestamps: `*_at`
- Soft deletion: `deleted_at`
- Database enums only for highly stable domains; use check constraints or catalogs for evolving states.

The conceptual model has 54 domain tables. The physical model has 55 tables because `idempotency_records` is operational API infrastructure. Tenant identifiers are also repeated on security-sensitive junction tables so PostgreSQL can enforce RLS directly.

[Persian version](data-dictionary.fa.md)
