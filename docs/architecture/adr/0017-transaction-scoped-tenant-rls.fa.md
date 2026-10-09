---
title: ADR 0017 - زمینه tenant در تراکنش و RLS اجباری
lang: fa
status: accepted
updated: 2026-10-09
---

# ADR 0017 — زمینه tenant در تراکنش و RLS اجباری

## تصمیم

هر request برنامه و هر job که به دادهٔ tenant دسترسی دارد داخل یک تراکنش دیتابیس اجرا می‌شود. ابتدای تراکنش یکی از توابع security-definer برای کاربر، API key یا worker فراخوانی می‌شود. تابع ابتدا عضویت فعال یا اعتبار کلید را کنترل و سپس شناسه‌های سازمان، workspace، کاربر و API key را به‌صورت transaction-local تنظیم می‌کند.

RLS روی جدول‌های tenantدار هم فعال و هم `FORCE` است. policy سازمان و workspace هم‌زمان اعمال می‌شوند و policy مربوط به workspace محدودکننده است. نقش‌های runtime از نوع `NOLOGIN` و `NOBYPASSRLS` هستند و وظایف app، auth و worker جدا شده‌اند. نبود context به‌صورت پیش‌فرض هیچ رکوردی نشان نمی‌دهد.

## پیامدها

- استفادهٔ مجدد از connection pool باعث نشت context نمی‌شود.
- سرویس با مالک جدول یا کاربر migration اجرا نمی‌شود.
- CI حالت بدون context، context بین دو tenant، نوشتن بین tenantها و کلید ترکیبی ناسازگار را می‌آزماید.

[نسخه انگلیسی](0017-transaction-scoped-tenant-rls.en.md)
