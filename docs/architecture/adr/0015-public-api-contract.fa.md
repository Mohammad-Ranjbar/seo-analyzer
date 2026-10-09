---
title: ADR-0015 قرارداد عمومی HTTP API
lang: fa
status: accepted
date: 2026-10-09
deciders:
  - مالک محصول
  - مهندسی
---

# ADR-0015: قرارداد عمومی HTTP API

## زمینه و بیان مسئله

پیش از پیاده‌سازی Endpointهای کسب‌وکار، API به قواعد پایداری برای انتخاب نسخه، خطا، پیمایش
Collection و Retry امن نیاز دارد. این قواعد باید برای Client ماشینی مناسب باشند، بدون اینکه پیش از
تأیید Constraintها و سیاست‌های RLS به مدل دامنه یا Migration دیتابیس منجر شوند.

## محرک‌های تصمیم

- قرارداد صریح و قابل پردازش ماشینی
- رفتار قابل پیش‌بینی Retry برای عملیات Create و طولانی
- پیمایش پایدار هم‌زمان با افزوده‌شدن رکوردهای جدید
- سطح کوچک و سازگار با Framework برای MVP
- نداشتن وابستگی به مدل فیزیکی تأییدنشده دیتابیس

## نتیجه تصمیم

قرارداد تعریف‌شده در [قرارداد عمومی API](../../api/contract.fa.md) استفاده می‌شود:

- Versioning با Header اجباری `API-Version: 1`
- Endpoint عملیاتی و بدون نسخه `GET /api/health`
- قالب Problem Details مطابق RFC 9457 همراه کد خطای پایدار پروژه
- Pagination رو به جلو با Cursor مات، اندازه پیش‌فرض ۲۵ و حداکثر ۱۰۰
- Header برابر `Idempotency-Key` روی Mutationهای Retryable که صریحاً مشخص شده‌اند؛ Scope آن Caller
  و Operation است، Fingerprint درخواست نگهداری می‌شود و حداقل زمان نگهداری ۲۴ ساعت است

در این مرحله Version Gate، شناسه Request، Serializer مربوط به Problem Details، رفتار Health، ابزارهای
Pagination و اعتبارسنجی و Fingerprint مربوط به Idempotency پیاده شده‌اند. اتصال به Endpoint همراه
قرارداد تأییدشده هر بخش انجام می‌شود. ذخیره Idempotency تا تأیید Constraint فیزیکی، Tenant Scope،
مرز Transaction و سیاست RLS متوقف می‌ماند.

## پیامدها

### مثبت

- Client به‌جای شکل خطای وابسته به Framework، خطای صریح دریافت می‌کند.
- Cursor pagination از تکرار یا جاماندن رکوردها در Offset pagination روی داده متغیر جلوگیری می‌کند.
- Mutation تکرارشده می‌تواند بدون اجرای دوباره Side Effect، نتیجه اصلی را بازگرداند.
- کار دیتابیس پشت Design Gate فعلی باقی می‌ماند.

### منفی

- مشاهده Versioning مبتنی بر Header هنگام مرور دستی از URI versioning دشوارتر است.
- تعداد دقیق کل نتایج به‌صورت پیش‌فرض ارائه نمی‌شود.
- Idempotency پیش از عرضه Endpoint کسب‌وکار به Storage پایدار و طراحی دقیق Transaction نیاز دارد.
- سند IETF مربوط به `Idempotency-Key` که در طراحی استفاده شده یک Internet-Draft منقضی است، نه RFC.

## اعتبارسنجی و رعایت تصمیم

- هر Controller عمومی کسب‌وکار باید نسخه `1` را صریحاً اعلام کند.
- نسخه مفقود یا بدقالب پاسخ `400` و نسخه عددی پشتیبانی‌نشده پاسخ `406` می‌گیرد.
- همه پاسخ‌های 4xx و 5xx از `application/problem+json` استفاده می‌کنند.
- Cursor صفحه‌بندی مات، دارای کنترل تمامیت و وابسته به Scope مؤثر Query است.
- یک Idempotency Key برای Fingerprint متفاوت قابل استفاده مجدد نیست.
- پیاده‌سازی Idempotency صرفاً In-memory در محیط مشترک یا Production مجاز نیست.

## زمان بازبینی

هنگام پیشنهاد نسخه `2`، نیاز به Pagination دوطرفه یا Total دقیق، جایگزینی یا انتشار نهایی سند
Idempotency-Key به‌صورت RFC، یا پیش از پیاده‌سازی Storage مربوط به Idempotency بازبینی شود.

[English version](0015-public-api-contract.en.md)
