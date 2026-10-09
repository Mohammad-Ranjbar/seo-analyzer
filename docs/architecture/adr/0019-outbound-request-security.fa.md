---
title: ADR 0019 - امنیت درخواست خروجی و crawler
lang: fa
status: accepted
updated: 2026-10-09
---

# ADR 0019 — امنیت درخواست خروجی و crawler

## تصمیم

برای crawl فقط HTTP و HTTPS پذیرفته می‌شود و webhook الزاماً HTTPS است. hostname پیش از اتصال resolve می‌شود و همهٔ آدرس‌های loopback، private، link-local، multicast، unspecified، CGNAT، metadata و سایر محدوده‌های غیرعمومی در IPv4 و IPv6 رد می‌شوند. اتصال فقط به IP اعتبارسنجی‌شده انجام می‌شود و بررسی hostname در TLS حفظ می‌شود. هر redirect دوباره اعتبارسنجی و تعداد آن به پنج محدود می‌شود.

robots.txt رعایت می‌شود، user-agent مشخص است، concurrency و delay برای هر host محدود است و سقف حجم پاسخ، decompression، content-type و timeout مراحل اتصال/هدر/body enforce می‌شود. ابتدا HTML دریافت می‌شود؛ headless فقط پس از ارزیابی محدود و با بودجهٔ صفحهٔ مستقل فعال می‌شود. مقصد webhook نیز همین کنترل‌های SSRF را دارد.

## پیامدها

- DNS rebinding و تغییر مقصد با redirect تهدید اصلی محسوب می‌شوند.
- ورودی tenant نمی‌تواند سقف‌های مدیریتی crawler را افزایش دهد.
- محدودیت egress زیرساخت مکمل کنترل برنامه است، نه جایگزین آن.

[نسخه انگلیسی](0019-outbound-request-security.en.md)
