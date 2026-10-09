---
title: ADR-0004 RBAC در Workspace
lang: fa
status: accepted
date: 2026-10-09
---

# ADR-0004: Role سفارشی با Permission Catalog

## زمینه و مسئله
سازمان نقش ثابت Owner/Admin/Member دارد، ولی هر Workspace به Roleهای متناسب با کار خود نیاز دارد.

## محرک‌ها
- مدیریت قابل فهم برای مدیر
- Enforcement قابل تست
- جلوگیری از Permission متنی بدون معنا
- Scope مستقل Workspaceها

## گزینه‌ها
1. Role ثابت در همه سطوح
2. Permission آزاد و Policy Engine پویا
3. Permission Catalog سیستمی و Role سفارشی

## تصمیم
Permissionها به‌صورت Resource/Action توسط سیستم تعریف می‌شوند. مدیر Workspace Role دلخواه می‌سازد و Permissionها را ترکیب می‌کند. عضویت و Role در هر Workspace مستقل است.

## پیامدهای مثبت
- انعطاف مناسب بدون Rule DSL پیچیده
- قابلیت Audit و تست Matrix دسترسی
- API Key می‌تواند همان Permission Catalog را استفاده کند.

## پیامدهای منفی و ریسک‌ها
- Permission جدید به تغییر نرم‌افزار نیاز دارد.
- تغییر Role ممکن است دسترسی بسیاری از اعضا را هم‌زمان تغییر دهد.

## زمان بازبینی
وقتی نیاز واقعی به Attribute-based policy با شواهد مشخص ایجاد شد.

[English version](0004-workspace-rbac.en.md)
