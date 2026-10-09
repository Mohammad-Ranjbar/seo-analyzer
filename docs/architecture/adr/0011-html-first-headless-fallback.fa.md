---
title: ADR-0011 HTML-first همراه Headless fallback
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0011: HTML-first همراه Headless fallback

## زمینه و مسئله
رندر مرورگر هزینه‌بر است، ولی برخی فروشگاه‌ها محتوای محصول را فقط با JavaScript ارائه می‌کنند.

## محرک‌ها
- مصرف کم منابع
- پوشش سایت‌های JavaScript-heavy
- رفتار قابل پیش‌بینی
- سقف مدیریتی MVP

## گزینه‌ها
1. فقط HTTP HTML
2. Headless برای تمام صفحات
3. HTML اولیه و fallback مشروط

## تصمیم
ابتدا HTML پاسخ تحلیل می‌شود. اگر سیگنال‌های لازم وجود نداشت و Limit اجازه داد، همان URL با Headless Browser رندر می‌شود. علت fallback ثبت می‌شود.

## پیامدهای مثبت
- بیشتر صفحات با هزینه کم پردازش می‌شوند.
- پوشش سایت‌های پویا حفظ می‌شود.

## پیامدهای منفی و ریسک‌ها
- تشخیص نیاز به fallback ممکن است اشتباه باشد.
- Browser worker سطح حمله و مصرف بیشتری دارد.

## زمان بازبینی
پس از اندازه‌گیری درصد fallback و هزینه واقعی آن.

[English version](0011-html-first-headless-fallback.en.md)
