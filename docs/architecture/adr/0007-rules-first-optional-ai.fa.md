---
title: ADR-0007 هسته Rule-based و AI اختیاری
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0007: هسته Rule-based و AI اختیاری

## زمینه و مسئله
MVP نباید به سرویس AI پولی وابسته باشد، ولی پیشنهاد رقیب و تولید متن می‌تواند از AI سود ببرد.

## محرک‌ها
- هزینه ابزار خارجی صفر
- خروجی قابل توضیح و تکرارپذیر
- ادامه کار Audit بدون AI
- امکان Local model یا BYOK

## گزینه‌ها
1. AI اجباری
2. بدون AI
3. Rule-based core همراه AI اختیاری

## تصمیم
Audit، Score و Action Plan پایه بدون AI کار می‌کنند. AI فقط Adapter اختیاری برای پیشنهاد یا تولید است و از مدل محلی یا Credential کاربر استفاده می‌کند.

## پیامدهای مثبت
- Vendor lock-in کمتر
- تست‌پذیری و هزینه قابل کنترل
- کاهش اثر قطعی سرویس AI

## پیامدهای منفی و ریسک‌ها
- کیفیت Templateهای بدون AI محدودتر است.
- BYOK به نگهداری امن Credential نیاز دارد.

## زمان بازبینی
پس از Benchmark فارسی و داده واقعی هزینه/کیفیت.

[English version](0007-rules-first-optional-ai.en.md)
