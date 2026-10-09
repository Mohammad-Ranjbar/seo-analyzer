---
title: فرهنگ داده
lang: fa
status: approved
updated: 2026-10-09
---

# فرهنگ داده

این سند مسئولیت جدول‌ها را تعریف می‌کند. ستون‌ها، قیدها، indexها، relationها و policyهای دقیق RLS در [قرارداد Prisma](../../src/prisma/contract.prisma) و migration بازبینی‌شدهٔ آن قابل اجرا هستند.

| گروه | جدول | مسئولیت |
|---|---|---|
| Identity | `users` | حساب، وضعیت و پروفایل پایه |
| Identity | `user_contacts` | موبایل/ایمیل Normalized، اصلی و تأییدشده |
| Identity | `user_credentials` | Password hash و اطلاعات چرخش Credential |
| Identity | `otp_challenges` | OTP hash، هدف، انقضا و شمار تلاش |
| Identity | `auth_sessions` | Refresh session، دستگاه و ابطال |
| Tenancy | `organizations` | Tenant اصلی و تنظیمات پایه |
| Tenancy | `organization_memberships` | عضو و نقش ثابت سازمان |
| Tenancy | `organization_invitations` | دعوت موبایل، ایمیل یا لینک |
| Tenancy | `workspaces` | فضای کاری داخل سازمان |
| Access | `workspace_members` | عضویت انتخابی عضو سازمان در Workspace |
| Access | `permissions` | Catalog ثابت Resource/Action |
| Access | `workspace_roles` | Role سفارشی Workspace |
| Access | `workspace_role_permissions` | Permissionهای هر Role |
| Access | `workspace_member_roles` | Roleهای عضو Workspace |
| Projects | `seo_projects` | Aggregate اصلی پروژه SEO |
| Projects | `project_scopes` | پاسخ‌های ساختاریافته Scope |
| Projects | `project_scope_categories` | دسته‌های هدف پروژه |
| Projects | `competitors` | رقیب تأییدشده یا آرشیوشده |
| Projects | `competitor_suggestions` | پیشنهاد، شواهد و تصمیم کاربر |
| Projects | `web_properties` | دامنه/Subdomain کاربر یا رقیب |
| Crawl | `crawl_configurations` | سقف، Rate، Depth و رفتار Property |
| Crawl | `crawl_schedules` | برنامه هفتگی یا ماهانه |
| Crawl | `crawl_runs` | اجرای Crawl، وضعیت و آمار |
| Crawl | `crawl_pages` | هویت پایدار URL در Property |
| Crawl | `crawl_page_snapshots` | داده استخراج‌شده صفحه در یک Run |
| Crawl | `crawl_links` | لینک کشف‌شده بین صفحات |
| Crawl | `page_type_overrides` | اصلاح تشخیص Product/Category |
| Analysis | `audit_rules` | هویت پایدار Rule |
| Analysis | `audit_rule_versions` | منطق و پارامترهای نسخه‌دار Rule |
| Analysis | `audit_findings` | نتیجه Rule با Severity و Evidence |
| Analysis | `score_model_versions` | وزن و فرمول امتیاز |
| Analysis | `score_snapshots` | امتیازهای تفکیک‌شده در زمان |
| Analysis | `competitor_comparisons` | مقایسه کلی سایت و رقبا |
| Actions | `action_items` | Task پیشنهادی و وضعیت کاربر |
| Actions | `action_item_status_history` | تاریخچه تغییر وضعیت Task |
| Actions | `action_item_verifications` | نتیجه فنی Crawl بعدی |
| Catalog | `brands` | Brand اختیاری محصول |
| Catalog | `categories` | Category سلسله‌مراتبی |
| Catalog | `products` | محصول Canonical پروژه |
| Catalog | `product_categories` | ارتباط چندبه‌چند و Category اصلی |
| Catalog | `product_sources` | API/Crawl، URL و External ID |
| Generation | `seo_generation_runs` | یک درخواست تولید و Context آن |
| Generation | `seo_generation_versions` | Title، Meta، Slug و تصمیم کاربر |
| Generation | `seo_generation_keywords` | Keywords مرتب‌شده هر نسخه |
| API | `api_keys` | Hash و Metadata کلید Workspace |
| API | `api_key_permissions` | Permissionهای کلید |
| API | `api_key_project_scopes` | پروژه‌های مجاز کلید |
| API | `idempotency_records` | Fingerprint درخواست، lock و پاسخ قابل replay با نگه‌داری ۲۴ساعته |
| Webhook | `webhook_endpoints` | URL، Secret رمزنگاری‌شده و وضعیت |
| Webhook | `webhook_deliveries` | تلاش، پاسخ و Retry تحویل |
| Governance | `usage_events` | رخداد تغییرناپذیر مصرف |
| Governance | `usage_daily_summaries` | خلاصه روزانه قابل بازسازی |
| Governance | `audit_logs` | اقدامات مهم و Actor/Target |
| Governance | `waitlist_entries` | درخواست و تصمیم دسترسی بتا |
| Governance | `deletion_requests` | مهلت بازیابی و حذف قطعی |

## قراردادهای نام‌گذاری

- نام جدول و ستون: `snake_case`
- کلید اصلی: `id`
- کلید خارجی: `<entity>_id`
- زمان‌ها: `*_at`
- Soft delete: `deleted_at`
- Enumها در دیتابیس فقط برای دامنه‌های بسیار پایدار؛ سایر وضعیت‌ها با Check Constraint یا Catalog مدیریت می‌شوند.

مدل مفهومی ۵۴ جدول دامنه دارد. مدل فیزیکی به‌دلیل جدول عملیاتی `idempotency_records` شامل ۵۵ جدول است. شناسه‌های tenant روی جدول‌های واسط حساس نیز تکرار شده‌اند تا PostgreSQL بتواند RLS را مستقیماً enforce کند.

[English version](data-dictionary.en.md)
