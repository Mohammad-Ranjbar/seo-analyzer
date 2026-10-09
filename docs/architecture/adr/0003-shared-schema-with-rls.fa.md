---
title: ADR-0003 Shared Schema همراه RLS
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0003: Shared Schema همراه PostgreSQL RLS

## زمینه و مسئله
محصول چندمستاجری است و نشت داده بین Organizationها یا Workspaceها غیرقابل قبول است.

## محرک‌ها
- جداسازی قابل دفاع
- عملیات ساده‌تر از Schema یا Database جدا
- Query و Migration مشترک
- امکان تست منفی خودکار

## گزینه‌ها
1. Shared Schema با کنترل برنامه
2. Shared Schema همراه RLS و کنترل برنامه
3. Schema جدا برای هر Organization

## تصمیم
تمام Tenantها از Schema مشترک استفاده می‌کنند. ستون‌های Tenant در جداول مرتبط وجود دارند و دسترسی هم در برنامه و هم با RLS محدود می‌شود.

## پیامدهای مثبت
- دفاع چندلایه در برابر Query بدون Scope
- Migration و گزارش‌گیری ساده‌تر
- هزینه عملیاتی مناسب MVP

## پیامدهای منفی و ریسک‌ها
- Context درخواست و Job باید همیشه به Connection منتقل شود.
- Policy اشتباه می‌تواند دسترسی را مسدود یا باز کند.
- عملیات مدیر سیستم نیازمند مسیر صریح و Auditشده است.

## کنترل‌ها
- تست Cross-tenant برای تمام Repositoryها
- ممنوعیت Connection عمومی با `BYPASSRLS` در مسیر عادی
- ایندکس با پیشوند Tenant روی Queryهای پرتکرار

## زمان بازبینی
پس از داده واقعی Scale یا نیاز قراردادی به جداسازی فیزیکی.

[English version](0003-shared-schema-with-rls.en.md)
