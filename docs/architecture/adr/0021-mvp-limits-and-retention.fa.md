---
title: ADR 0021 - محدودیت‌ها و نگه‌داری داده در MVP
lang: fa
status: accepted
updated: 2026-10-09
---

# ADR 0021 — محدودیت‌ها و نگه‌داری داده در MVP

## تصمیم

پیش‌فرض هر workspace شامل ۱۰ پروژهٔ فعال، ۱۰ رقیب تأییدشده برای هر پروژه، یک crawl در حال اجرا برای هر پروژه، دو job هم‌زمان crawl، ۲۰۰۰ صفحه و عمق ۵ در هر crawl، یک request در ثانیه برای هر host، timeout سی‌ثانیه‌ای و حداکثر ۱۰۰ صفحهٔ headless است. سقف مدیریتی ۱۰هزار صفحه، عمق ۱۰، delay شصت‌ثانیه‌ای، timeout صدوبیست‌ثانیه‌ای و بودجهٔ headless تا کل صفحات است که دیتابیس enforce می‌کند.

snapshot استخراج‌شده، finding، score و usage تا زمان وجود پروژه نگه‌داری می‌شوند. log عملیاتی job سی روز، metadata صف failed/dead-letter نود روز، body پاسخ webhook هفت روز، audit log سیصدوشصت‌وپنج روز و idempotency record بیست‌وچهار ساعت نگه‌داری می‌شود. دادهٔ tenant پس از soft delete سی روز قابل بازیابی است و سپس به‌صورت asynchronous purge می‌شود؛ backup چرخهٔ جدا و آزموده‌شده دارد.

## پیامدها

- مقادیر پیش‌فرض قابل تنظیم‌اند ولی caller نمی‌تواند از hard cap عبور کند.
- HTML کامل و secretهای احراز هویت اصلاً ذخیره نمی‌شوند تا موضوع retention باشند.
- cleanup باید idempotent، tenant-scoped، قابل مشاهده و قابل ادامه باشد.

[نسخه انگلیسی](0021-mvp-limits-and-retention.en.md)
