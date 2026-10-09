---
title: مدل مفهومی دیتابیس
lang: fa
status: approved
version: 0.1
updated: 2026-10-09
---

# مدل مفهومی PostgreSQL

## اصول

- Shared Schema همراه Row-Level Security
- Organization مرز اصلی Tenant و Workspace مرز مجوز عملیاتی است.
- تمام داده‌های تاریخی مهم Versioned یا Append-only هستند.
- HTML کامل صفحات ذخیره نمی‌شود.
- تاریخ‌ها در UTC و زمان‌بندی همراه Timezone نگهداری می‌شود.
- Secretها Hash یا رمزنگاری می‌شوند.

## هویت و Tenant

`users` حساب اصلی را نگه می‌دارد. `user_contacts` موبایل و ایمیل Normalized و قابل تأیید را جدا می‌کند. `organization_memberships` نقش ثابت Owner/Admin/Member و `workspace_members` دسترسی به فضای کاری را تعریف می‌کنند.

## RBAC

`permissions` Catalog سیستمی Resource/Action است. `workspace_roles` توسط مدیر ساخته می‌شود و از طریق `workspace_role_permissions` Permission می‌گیرد. انتساب عضو به Role در `workspace_member_roles` نگهداری می‌شود.

## پروژه و وب‌سایت

هر `seo_project` به Workspace تعلق دارد و یک `project_scope` ساختاریافته دارد. `web_properties` دامنه اصلی، Subdomainهای سایت و Propertyهای رقبا را مدل می‌کند. `competitors` یک کسب‌وکار رقیب و `competitor_suggestions` چرخه پیشنهاد و تأیید را ثبت می‌کند.

## Crawl

`crawl_schedules` برنامه دستی/هفتگی/ماهانه را نگه می‌دارد. `crawl_runs` یک اجرای مستقل است. `crawl_pages` هویت پایدار URL و `crawl_page_snapshots` داده استخراج‌شده هر اجرا را ثبت می‌کند. `page_type_overrides` اصلاح کاربر برای Product/Category را حفظ می‌کند.

## تحلیل

`audit_rules` هویت Rule و `audit_rule_versions` منطق نسخه‌دار را نگه می‌دارند. `audit_findings` نتیجه هر Rule است. `score_model_versions` وزن‌ها و `score_snapshots` نتیجه قابل مقایسه را ثبت می‌کنند. `competitor_comparisons` فقط مقایسه کلی سایت را نگه می‌دارد.

## اقدام

`action_items` وضعیت کاری کاربر را نگه می‌دارد. `action_item_status_history` تغییرات را Audit می‌کند و `action_item_verifications` نتیجه فنی Crawl بعدی را جدا ثبت می‌کند.

## محصول و تولید SEO

`products` از API یا Crawl ایجاد می‌شود. `product_sources` منشأ و شناسه خارجی را نگه می‌دارد. `categories` سلسله‌مراتبی و رابطه با محصول چندبه‌چند است. `seo_generation_versions` تمام نسخه‌های خروجی و تصمیم accepted/rejected/applied را حفظ می‌کند.

## API و عملیات

`api_keys` در Workspace ساخته می‌شود و با جداول Permission و Project scope محدود می‌گردد. `webhook_deliveries` تمام تلاش‌های تحویل را ثبت می‌کند. `usage_events` منبع حقیقت مصرف و `usage_daily_summaries` خلاصه گزارش است. `audit_logs` اقدامات مهم و `deletion_requests` حذف قطعی را مدیریت می‌کند.

## قیدهای کلیدی

- Contact تأییدشده در نوع خود Unique است.
- یک Organization دقیقاً یک Owner فعال یا فرایند انتقال مالکیت معتبر دارد.
- Membership تکراری مجاز نیست.
- URL Canonical در هر Property Unique است.
- هر محصول حداکثر یک Category اصلی دارد.
- نسخه Rule و Score پس از استفاده تغییرناپذیر است.
- API Key و OTP خام ذخیره نمی‌شود.

[English version](conceptual-model.en.md)
