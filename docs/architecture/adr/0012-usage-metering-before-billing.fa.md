---
title: ADR-0012 ثبت مصرف پیش از Billing
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0012: Usage Metering بدون Billing در MVP

## زمینه و مسئله
مدل درآمدی آینده به مصرف وابسته است، ولی قیمت و هزینه واقعی هنوز اعتبارسنجی نشده است.

## محرک‌ها
- یادگیری هزینه واقعی
- جلوگیری از طراحی زودهنگام Payment
- اعمال Limit مدیریتی
- داده لازم برای پلن‌های آینده

## گزینه‌ها
1. Billing کامل از ابتدا
2. هیچ ثبت مصرفی
3. Event مصرف و Summary بدون Payment

## تصمیم
MVP Usage Event تغییرناپذیر و Summary روزانه قابل بازسازی دارد. Subscription، Invoice، Payment و Credit balance ساخته نمی‌شوند.

## پیامدهای مثبت
- داده واقعی برای قیمت‌گذاری
- Scope کمتر و ریسک مالی پایین‌تر
- امکان Limit بر Crawl، Page، Headless و AI

## پیامدهای منفی و ریسک‌ها
- تبدیل Usage به Billing بعداً Migration می‌خواهد.
- Event duplication باید با Idempotency کنترل شود.

## زمان بازبینی
پس از رسیدن به داده معتبر بتا و پیش از نخستین پلن پولی.

[English version](0012-usage-metering-before-billing.en.md)
