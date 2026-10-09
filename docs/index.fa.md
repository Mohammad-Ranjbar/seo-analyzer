---
title: راهنمای مستندات SEO Analyzer
lang: fa
status: active
updated: 2026-10-09
---

# مستندات Persian SEO Analyzer

این پوشه Vault رسمی و قابل نسخه‌بندی پروژه است. متن فارسی و انگلیسی هر سند در دو فایل مستقل با نام یکسان و پسوند زبانی نگهداری می‌شود.

## مسیر مطالعه

1. [طرح کسب‌وکار](business/business-plan.fa.md)
2. [نیازمندی‌های محصول](product/prd.fa.md)
3. [واژه‌نامه](product/glossary.fa.md)
4. [نمای کلی معماری](architecture/overview.fa.md)
5. [مدل مفهومی دیتابیس](database/conceptual-model.fa.md)
6. [فرهنگ داده](database/data-dictionary.fa.md)
7. [راهنمای ERD و خروجی‌های drawDB](database/README.fa.md)
8. [چک‌لیست تأیید طراحی](review/design-approval-checklist.fa.md)
9. [تصمیم‌های معماری](architecture/adr/README.fa.md)
10. [قرارداد عمومی API](api/contract.fa.md)

## وضعیت اسناد

- `approved`: دامنه یا تصمیم توسط مالک محصول تأیید شده است.
- `accepted`: یک ADR پذیرفته و لازم‌الاجرا است.
- `draft`: سند هنوز نیازمند بازبینی و تأیید است.
- `superseded`: تصمیم با ADR جدید جایگزین شده است.

## قواعد نگهداری

- نسخه فارسی و انگلیسی باید از نظر معنا همگام بمانند.
- نمودار drawDB فقط ابزار نمایش است؛ مدل و تصمیم‌ها باید در Markdown نیز توضیح داده شوند.
- تغییر معماری مهم بدون ADR جدید انجام نمی‌شود.
- این Vault شامل Secret، Token، داده واقعی مشتری یا HTML کامل Crawlشده نمی‌شود.

[English version](index.en.md)
