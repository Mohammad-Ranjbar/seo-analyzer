---
title: ADR 0018 - پردازش job با BullMQ
lang: fa
status: accepted
updated: 2026-10-09
---

# ADR 0018 — پردازش job با BullMQ

## تصمیم

از BullMQ و Redis با worker مستقل استفاده می‌شود. نود API فقط job پایدار ثبت می‌کند و شناسهٔ resource را برمی‌گرداند؛ workerها صف‌های crawl، تحلیل، تولید محتوا، purge و webhook را پردازش می‌کنند. payload فقط شامل شناسه‌هاست، worker context tenant را داخل تراکنش می‌سازد و jobها idempotent هستند.

retry با exponential backoff و jitter انجام می‌شود. خطاهای موقت شبکه و provider retry می‌شوند؛ خطای validation، authorization، منع robots و 4xx دائمی retry نمی‌شوند. پیش‌فرض crawl و generation پنج تلاش، webhook هشت تلاش و purge سه تلاش است. job نهایی ناموفق در حالت failed/dead-letter برای بررسی نگه‌داری می‌شود.

## پیامدها

- پردازش طولانی crawl در web process انجام نمی‌شود.
- نام صف و schemaی payload مستقل از API عمومی v1 نسخه‌بندی می‌شود.
- concurrency برای هر صف، workspace و host مقصد محدود است.

[نسخه انگلیسی](0018-bullmq-job-processing.en.md)
