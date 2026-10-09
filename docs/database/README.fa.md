---
title: راهنمای ERD و خروجی‌های دیتابیس
lang: fa
status: approved
updated: 2026-10-09
---

# ERD دیتابیس

مدل PostgreSQL تأییدشده در drawDB با نام **Persian SEO Analyzer — Conceptual MVP** ثبت شده است.

## نسخه آنلاین

- [بازکردن ERD در drawDB](https://drawdb.app/editor/diagrams/e3609f8c-bfec-4a15-85e6-2513c84e882b)
- وضعیت آخرین بررسی: ۵۴ جدول، ۹۱ رابطه و صفر Problem

دسترسی به نسخه آنلاین تابع حساب drawDB مالک پروژه است. این لینک نباید جایگزین فایل‌های نسخه‌بندی‌شده مخزن شود.

## فایل‌های قابل نگهداری

- [مدل DBML](seo-analyzer.dbml): منبع متنی، قابل Diff و مرجع اصلی ساختار مفهومی
- [خروجی JSON سازگار با drawDB](seo-analyzer.drawdb.json): نسخه قابل Import برای بازیابی و ویرایش در drawDB
- [مدل مفهومی](conceptual-model.fa.md): چرایی مرزبندی Domainها و Aggregateها
- [فرهنگ داده](data-dictionary.fa.md): مسئولیت و قواعد هر گروه داده

خروجی SVG کامل drawDB حدود ۲۰۶ مگابایت بود؛ برای جلوگیری از سنگین‌شدن مخزن ذخیره نشد. این یک محدودیت خروجی تصویری ابزار است و روی کامل‌بودن DBML، JSON یا نسخه آنلاین اثری ندارد.

## مرز فعلی

این مدل برای مستندسازی و تأیید طراحی است. فایل SQL، Migration یا کد اجرایی محسوب نمی‌شود. تبدیل آن به مدل فیزیکی فقط بعد از تأیید جداگانه انجام خواهد شد.

[English version](README.en.md)
