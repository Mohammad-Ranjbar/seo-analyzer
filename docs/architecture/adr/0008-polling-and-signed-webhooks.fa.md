---
title: ADR-0008 Polling و Webhook امضاشده
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0008: Polling همراه Webhook امضاشده

## زمینه و مسئله
Crawl ناهمگام است و مشتری API باید وضعیت و پایان کار را قابل اعتماد دریافت کند.

## محرک‌ها
- مسیر ساده و همیشه در دسترس
- اعلان Push اختیاری
- Retry و Idempotency
- احراز اصالت Payload

## گزینه‌ها
1. فقط Polling
2. فقط Webhook
3. Polling و Webhook امضاشده

## تصمیم
Polling منبع قطعی وضعیت است. Workspace می‌تواند Endpoint وبهوک تعریف کند. Payload امضا، Delivery ID و Retry محدود دارد.

## پیامدهای مثبت
- مشتری حتی در شکست Webhook نتیجه را بازیابی می‌کند.
- ادغام رویدادمحور ممکن است.

## پیامدهای منفی و ریسک‌ها
- تحویل Webhook State و Queue بیشتری می‌خواهد.
- SSRF و Replay attack باید کنترل شود.

## کنترل‌ها
- URL validation، محدودیت Redirect و جلوگیری از شبکه خصوصی
- Timestamp، Signature و Idempotency key

## زمان بازبینی
با اضافه‌شدن Event bus یا SLA رسمی.

[English version](0008-polling-and-signed-webhooks.en.md)
