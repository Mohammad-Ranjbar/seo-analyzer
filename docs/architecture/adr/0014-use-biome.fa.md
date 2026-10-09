---
title: ADR-0014 استفاده از Biome برای بررسی ایستا و فرمت
lang: fa
status: accepted
date: 2026-10-09
deciders:
  - مالک محصول
  - مهندسی
---

# ADR-0014: استفاده از Biome برای بررسی ایستا و فرمت

## زمینه و بیان مسئله

مخزن اولیه برای Prettier و oxlint تنظیمات جدا داشت. برای تیم کوچک، یک ابزار سریع و قطعی با یک فایل تنظیمات و یک Gate مشترک در محیط محلی و CI نگهداری ساده‌تری دارد.

## محرک‌های تصمیم

- یک منبع حقیقت برای Ruleهای Format و Lint
- بازخورد سریع محلی و اتصال ساده به CI
- پشتیبانی مناسب TypeScript
- تنظیمات و Dependency کمتر
- خروجی قابل تکرار روی سیستم توسعه‌دهندگان

## گزینه‌های بررسی‌شده

1. Biome برای Format، Lint و مرتب‌سازی Import
2. Prettier همراه ESLint
3. Prettier همراه oxlint
4. Formatter و Linter جداگانه برای هر Package

## نتیجه تصمیم

Biome تنها Formatter، Linter و Import Organizer پروژه است.

- نسخه Biome دقیقاً Pin می‌شود.
- `npm run check` به‌عنوان Gate بدون تغییر فایل در Local و CI اجرا می‌شود.
- `npm run lint` و `npm run format` برای بررسی‌های متمرکز باقی می‌مانند.
- `npm run check:write` فقط برای Fix خودکار صریح استفاده می‌شود.
- Prettier، oxlint و فایل‌های تنظیمات آن‌ها حذف می‌شوند.
- Artifactهای تولیدشده Prisma از پردازش Biome خارج می‌شوند.

## پیامدها

### مثبت

- یک فایل تنظیمات کل Workflow کیفیت کد را کنترل می‌کند.
- رفتار Local و CI آسان‌تر بازتولید می‌شود.
- Ruleهای هم‌پوشان و Dependencyهای کمتری نگهداری می‌شوند.

### منفی

- Rule فاقد معادل در Biome ممکن است به روش اعتبارسنجی دیگری نیاز داشته باشد.
- Upgrade نسخه می‌تواند تغییر Format گسترده ایجاد کند.
- بررسی‌های مخصوص Framework همچنان به TypeScript، Nest یا Test اختصاصی نیاز دارند.

## ریسک‌ها و راهکارها

| ریسک | راهکار |
|---|---|
| Rule مهم در Biome موجود نباشد | افزودن Compiler/Test متمرکز به‌جای Linter عمومی دوم |
| Upgrade باعث Diff بزرگ شود | Pin نسخه و انجام Upgrade در تغییر مستقل |
| فایل تولیدشده Noise ایجاد کند | خارج‌کردن Artifact تولیدشده و بررسی جداگانه فرایند تولید |

## اعتبارسنجی و رعایت تصمیم

- `npm run check` باید بدون تغییر فایل موفق شود.
- `npm run build`، تست Unit و تست End-to-end همچنان Gateهای مستقل هستند.
- Upgrade Biome باید Diff فرمت پاک و Test Suite موفق داشته باشد.

## زمان بازبینی

وقتی Biome دیگر Syntax موردنیاز TypeScript/NestJS را پشتیبانی نکند، یک Rule امنیتی یا صحت ضروری قابل اعمال نباشد، یا در Upgrade اصلی Biome.

[English version](0014-use-biome.en.md)
