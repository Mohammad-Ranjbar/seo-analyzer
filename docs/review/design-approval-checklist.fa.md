---
title: چک‌لیست تأیید طراحی
lang: fa
status: active
updated: 2026-10-09
---

# چک‌لیست تأیید طراحی

این سند Gate پیاده‌سازی دامنه است. ابزارهای زیربنایی و Endpointهای عملیاتی قابل ساخت هستند، اما تا پیش از تأیید موارد مرتبط «پیش از کدنویسی»، Migration دامنه، مدل ORM یا Endpoint کسب‌وکار ساخته نمی‌شود.

## وضعیت فعلی

| حوزه | سند مرجع | وضعیت | نتیجه |
|---|---|---|---|
| مدل کسب‌وکار | [طرح کسب‌وکار](../business/business-plan.fa.md) | تأییدشده | دامنه MVP و مدل رایگان مشخص است |
| مدل مفهومی دیتابیس | [مدل مفهومی](../database/conceptual-model.fa.md) | تأییدشده | ۵۴ جدول و ۹۱ رابطه در drawDB بدون خطا ثبت شده است |
| تصمیم‌های معماری | [فهرست ADR](../architecture/adr/README.fa.md) | پذیرفته‌شده | ۲۱ تصمیم معماری ثبت شده است |
| نیازمندی محصول | [PRD](../product/prd.fa.md) | تأییدشده | سناریوها و معیارهای پذیرش MVP الزام‌آورند |
| نمای معماری | [نمای کلی](../architecture/overview.fa.md) | تأییدشده | مرز API، worker، داده و ماژول‌ها مشخص است |
| فرهنگ داده | [فرهنگ داده](../database/data-dictionary.fa.md) | تأییدشده | قرارداد فیزیکی Prisma و migration قابل اجراست |

## الزامی پیش از کدنویسی

- [x] سناریوهای اصلی و معیار پذیرش PRD تأیید شود.
- [x] Lifecycle و مقدارهای مجاز Statusهای اصلی مشخص شود.
- [x] Constraintهای یکتایی، Nullability و حذف برای مدل فیزیکی تأیید شود.
- [x] سیاست دقیق RLS و نحوه تنظیم Tenant Context تعیین شود.
- [x] ORM و روش مدیریت Migration انتخاب و با ADR ثبت شود.
- [x] قرارداد API شامل Versioning، Error Format، Pagination و Idempotency تأیید شود.
- [x] معماری اجرای Jobهای Crawl، Queue و Retry انتخاب شود.
- [x] سیاست امنیتی SSRF، Robots، Rate Limit و Headless Fallback نهایی شود.
- [x] سیاست Session، Access/Refresh Token، Hash رمز و محدودیت OTP مشخص شود.
- [x] مقادیر پیش‌فرض Crawl و Retention داده تأیید شود.

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
