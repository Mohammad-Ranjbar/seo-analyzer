---
title: چک‌لیست تأیید طراحی
lang: fa
status: active
updated: 2026-10-09
---

# چک‌لیست تأیید طراحی

این سند Gate شروع پیاده‌سازی است. تا زمانی که موارد «پیش از کدنویسی» تأیید نشده‌اند، Migration، مدل ORM یا Endpoint اجرایی ساخته نمی‌شود.

## وضعیت فعلی

| حوزه | سند مرجع | وضعیت | نتیجه |
|---|---|---|---|
| مدل کسب‌وکار | [طرح کسب‌وکار](../business/business-plan.fa.md) | تأییدشده | دامنه MVP و مدل رایگان مشخص است |
| مدل مفهومی دیتابیس | [مدل مفهومی](../database/conceptual-model.fa.md) | تأییدشده | ۵۴ جدول و ۹۱ رابطه در drawDB بدون خطا ثبت شده است |
| تصمیم‌های معماری | [فهرست ADR](../architecture/adr/README.fa.md) | پذیرفته‌شده | ۱۲ تصمیم پایه ثبت شده است |
| نیازمندی محصول | [PRD](../product/prd.fa.md) | پیش‌نویس | نیازمند مرور سناریوها و معیارهای پذیرش است |
| نمای معماری | [نمای کلی](../architecture/overview.fa.md) | پیش‌نویس | مرز ماژول‌ها باید بعد از تصمیم‌های فنی نهایی شود |
| فرهنگ داده | [فرهنگ داده](../database/data-dictionary.fa.md) | پیش‌نویس | Constraint و Lifecycle دقیق هنوز نهایی نشده است |

## الزامی پیش از کدنویسی

- [ ] سناریوهای اصلی و معیار پذیرش PRD تأیید شود.
- [ ] Lifecycle و مقدارهای مجاز Statusهای اصلی مشخص شود.
- [ ] Constraintهای یکتایی، Nullability و حذف برای مدل فیزیکی تأیید شود.
- [ ] سیاست دقیق RLS و نحوه تنظیم Tenant Context تعیین شود.
- [ ] ORM و روش مدیریت Migration انتخاب و با ADR ثبت شود.
- [ ] قرارداد API شامل Versioning، Error Format، Pagination و Idempotency تأیید شود.
- [ ] معماری اجرای Jobهای Crawl، Queue و Retry انتخاب شود.
- [ ] سیاست امنیتی SSRF، Robots، Rate Limit و Headless Fallback نهایی شود.
- [ ] سیاست Session، Access/Refresh Token، Hash رمز و محدودیت OTP مشخص شود.
- [ ] مقادیر پیش‌فرض Crawl و Retention داده تأیید شود.

## الزامی پیش از بتای عمومی

- [ ] SMS Provider واقعی و سیاست عدم Logکردن OTP فعال شود.
- [ ] Webhook Signing، Rotation، Retry و Replay Protection تست شود.
- [ ] Observability شامل Log، Metric، Trace و Alert مشخص شود.
- [ ] Backup، Restore، Purge و درخواست حذف داده آزمایش شود.
- [ ] RLS با تست‌های جداسازی Tenant و مسیرهای مدیریتی ارزیابی شود.
- [ ] محدودیت مصرف برای ۱۰۰ کاربر آزمایشی و گزارش مصرف بررسی شود.

## قاعده تغییر وضعیت

هر سند فقط با تأیید صریح مالک محصول از `draft` به `approved` می‌رود. تصمیم معماری جدید یا تغییر تصمیم پذیرفته‌شده باید در ADR جدید ثبت شود؛ ویرایش نگارشی تصمیم موجود به ADR جدید نیاز ندارد.

[English version](design-approval-checklist.en.md)
