---
title: ADR-0013 استفاده از Prisma ORM 8
lang: fa
status: accepted
date: 2026-10-09
deciders:
  - مالک محصول
  - مهندسی
---

# ADR-0013: استفاده از Prisma ORM 8 با Migrationهای بازبینی‌شده PostgreSQL

## زمینه و بیان مسئله

برنامه برای مدل بزرگ PostgreSQL به یک لایه دسترسی Type-safe نیاز دارد، ولی کنترل‌های سطح دیتابیس مانند Row-Level Security، Check Constraint، Partial Index و Tenant Context صریح باید حفظ شوند. ORM نباید جایگزین کنترل امنیتی‌ای شود که PostgreSQL باید اعمال کند.

Prisma 8 از Workflow مبتنی بر Contract استفاده می‌کند. در زمان این تصمیم، Prisma 8 و `@prisma/orm-postgres` هنوز Release Candidate هستند و نسخه پایدار عمومی محسوب نمی‌شوند. جزئیات مدل فیزیکی و RLS در این ADR عمداً به تصمیم بعدی موکول شد و سپس در ADR 0016 و ADR 0017 پذیرفته شد.

## محرک‌های تصمیم

- Queryهای Type-safe و پشتیبانی مناسب Editor برای NestJS و TypeScript
- Workflow مبتنی بر PostgreSQL با امکان حفظ SQL بومی بازبینی‌شده
- Migration صریح و نسخه‌دار به‌جای همگام‌سازی Runtime
- مرز روشن بین مجوز برنامه و PostgreSQL RLS
- تجربه توسعه قابل نگهداری برای تیم کوچک اولیه
- نداشتن وابستگی اجباری به سرویس پولی Prisma یا دیتابیس Hosted

## گزینه‌های بررسی‌شده

1. Prisma ORM 8 با PostgreSQL Contract و Migration بازبینی‌شده
2. Drizzle ORM با SQL Migration
3. TypeORM با Migration تولیدشده
4. PostgreSQL Driver و SQL کاملاً دستی

## نتیجه تصمیم

برای دسترسی Type-safe برنامه به داده از Prisma ORM 8 و `@prisma/orm-postgres` استفاده می‌شود.

- Prisma Contract و خروجی‌های تولیدشده آن در Git نگهداری می‌شوند.
- Contract فیزیکی فقط پس از تأیید Constraintها و Lifecycleها به‌صورت تدریجی افزوده می‌شود.
- Migration Candidate به‌صورت محلی تولید و SQL آن پیش از اجرا بازبینی و تکمیل می‌شود.
- RLS Policy، تابع Tenant Context، Indexهای ویژه و قابلیت‌های پشتیبانی‌نشده PostgreSQL با SQL بازبینی‌شده پیاده می‌شوند.
- در محیط مشترک، Staging یا Production از Schema Push یا همگام‌سازی خودکار استفاده نمی‌شود.
- Prisma Postgres، Prisma Console یا سرویس پولی دیگری وابستگی اجباری پروژه نیست.
- نسخه‌های Release Candidate مربوط به Prisma 8 تا زمان بازبینی Upgrade دقیقاً Pin می‌شوند.
- پیش از بتای عمومی، پایداری Prisma 8 و Advisoryهای Dependency دوباره بررسی می‌شوند.

## پیامدها

### مثبت

- Queryهای برنامه بدون کنارگذاشتن کنترل‌های امنیتی PostgreSQL دارای Type تولیدشده می‌شوند.
- تغییر Contract و Migration در Git قابل بازبینی می‌ماند.
- قابلیت‌های بومی PostgreSQL موردنیاز مدل چندمستاجری قابل استفاده است.
- تیم اولیه API یکپارچه‌ای برای Query دارد و Mapping دستی کمتری می‌نویسد.

### منفی

- API و Artifactهای Release Candidate ممکن است پیش از نسخه پایدار تغییر کنند.
- برخی قابلیت‌های دیتابیس به SQL دستی نیاز دارند و فقط با Contract قابل بیان نیستند.
- Migration تولیدشده به‌تنهایی اثبات نمی‌کند که RLS و جداسازی Tenant صحیح است.
- درخت Dependency ابزار CLI فعلی Advisoryهای مخصوص ابزار توسعه دارد، هرچند Audit وابستگی‌های Production پاک است.

## ریسک‌ها و راهکارها

| ریسک | راهکار |
|---|---|
| تغییر ناسازگار Release Candidate | Pinکردن نسخه دقیق و Upgrade فقط با تغییر بازبینی‌شده |
| دورزدن فرض Tenant توسط Query | تنظیم Tenant Context در هر Transaction و تست جداسازی |
| حذف قابلیت بومی در Migration | بازبینی SQL Diff و نگهداری SQL سفارشی در Migration |
| ناهماهنگی فایل تولیدشده با Contract | تولید مجدد در CI و Failشدن در صورت تغییر Working Tree |
| رسیدن Advisory ابزار به Runtime | Audit جداگانه Production و مسدودکردن Release برای Finding مرتبط |

## اعتبارسنجی و رعایت تصمیم

- پس از هر تغییر Contract، دستور `npm run contract:emit` باید موفق باشد.
- Artifactهای تولیدشده باید با Contract ثبت‌شده یکسان باشند.
- هر Migration محیط Production نیازمند بازبینی انسانی است.
- سیاست‌های RLS پیش از Release به تست مثبت و منفی جداسازی Tenant نیاز دارند.
- کد Production برای Request و Job معمولی نباید از Credential مدیریتی دیتابیس استفاده کند.

## زمان بازبینی

هنگام انتشار نسخه پایدار Prisma 8، پیش از اجرای نخستین Migration فیزیکی در محیط مشترک، پیش از بتای عمومی، یا زمانی که نیازهای PostgreSQL/RLS به‌صورت امن قابل پیاده‌سازی نباشند.

[English version](0013-use-prisma-orm-8.en.md)
