---
title: نمای کلی معماری
lang: fa
status: approved
updated: 2026-10-09
---

# نمای کلی معماری

## وضعیت فعلی

مخزن از NestJS 12، TypeScript، Prisma ORM 8، PostgreSQL، Redis و BullMQ استفاده می‌کند. API یک modular monolith است و کارهای طولانی در worker مستقلی اجرا می‌شوند که همان codebase و contractها را به‌کار می‌برد.

## مرزهای منطقی

- Identity: کاربر، Contact، Credential، Session و OTP
- Tenancy: سازمان، عضویت، Workspace و RLS
- Access Control: Permission Catalog، Role سفارشی و API Key scope
- Projects: SEO Project، Scope، Property و Competitor
- Crawling: Schedule، Run، Page، Snapshot و Link
- Analysis: Rule، Finding، Score و Comparison
- Actions: Action Item، تاریخچه وضعیت و Verification
- Catalog: Product، Category، Brand و Source
- Generation: نسخه‌های پیشنهاد SEO و تصمیم کاربر
- Integrations: Webhook و AI Provider اختیاری
- Governance: Usage، Audit، Waitlist و Deletion

## جریان داده

1. درخواست معتبر به Organization و Workspace فعال متصل می‌شود.
2. RLS و لایه مجوز، دسترسی Tenant و Permission را بررسی می‌کنند.
3. Crawl Run در صف قرار می‌گیرد و URLها با محدودیت مشخص پردازش می‌شوند.
4. داده استخراج‌شده ذخیره و Ruleهای نسخه‌دار اجرا می‌شوند.
5. امتیاز و Action Item ساخته یا به‌روزرسانی می‌شود.
6. وضعیت از طریق Polling و در صورت تنظیم، Webhook امضاشده اعلام می‌شود.

## قیود معماری

- Tenant context برای درخواست HTTP و Job پس‌زمینه باید صریح و قابل Audit باشد.
- Background worker نباید RLS را بدون Scope معتبر دور بزند.
- Endpointهای عمومی از [قرارداد HTTP API](../api/contract.fa.md) پذیرفته‌شده پیروی می‌کنند.
- Crawl و Webhook باید Idempotent و Retry-safe باشند.
- Snapshot تاریخی تغییرناپذیر است؛ اصلاح داده با Snapshot یا Version جدید انجام می‌شود.
- Secret در Log، مستندات و Snapshot قرار نمی‌گیرد.

## انتخاب‌های integration که به بعد موکول شده‌اند

- روش نگهداری Credentialهای BYOK
- Provider ذخیره‌سازی object
- Provider مشاهده‌پذیری production

[English version](overview.en.md)
