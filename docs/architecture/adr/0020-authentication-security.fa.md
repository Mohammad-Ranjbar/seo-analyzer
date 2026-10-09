---
title: ADR 0020 - امنیت احراز هویت و session
lang: fa
status: accepted
updated: 2026-10-09
---

# ADR 0020 — امنیت احراز هویت و session

## تصمیم

رمز عبور با Argon2id و حداقل ۱۹ MiB حافظه، دو iteration و parallelism برابر ۱ hash می‌شود؛ پارامترها همراه hash ذخیره و پس از benchmark تولید قابل افزایش‌اند. access token پانزده دقیقه اعتبار دارد. refresh token یک مقدار تصادفی opaque است، فقط hash آن ذخیره می‌شود، در هر استفاده rotate می‌شود و در صورت replay کل خانواده revoke می‌شود. session پس از ۳۰ روز عدم فعالیت یا حداکثر ۹۰ روز منقضی می‌شود.

OTP شش‌رقمی، پنج‌دقیقه‌ای و یک‌بارمصرف است و حداکثر پنج تلاش verification دارد. ارسال بر اساس contact، IP و purpose محدود و cooldown آن افزایشی است. پیام خطای رمز و OTP وجود حساب را افشا نمی‌کند. تا زمان تنظیم provider واقعی و خاموش‌شدن log کد، OTP در beta عمومی فعال نمی‌شود.

## پیامدها

- دادهٔ احراز هویت با نقش دیتابیس جداگانهٔ auth مدیریت می‌شود.
- challengeهای ورود، تأیید contact و reset رمز به purpose خود محدودند.
- secretهای token و OTP وارد log یا event پایدار نمی‌شوند.

[نسخه انگلیسی](0020-authentication-security.en.md)
