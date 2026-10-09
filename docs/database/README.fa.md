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

## مرز مفهومی و فیزیکی

فایل‌های DBML و drawDB نمای مفهومی تأییدشده باقی می‌مانند. مدل فیزیکی قابل اجرا [قرارداد Prisma](../../src/prisma/contract.prisma) است و snapshot تغییرناپذیر و migration اولیهٔ آن در `migrations/` قرار دارد. مدل فیزیکی storage مربوط به idempotency، قیدهای status/check، کلیدهای خارجی ترکیبی tenant، RLS اجباری، نقش‌های runtime و توابع context تراکنشی را اضافه می‌کند.

migration اولیه روی PostgreSQL خالی اجرا شده، با قرارداد emitted به‌صورت strict تطبیق داده شده و با تست‌های مثبت و منفی جداسازی tenant بررسی شده است.

[English version](README.en.md)
