---
title: قرارداد عمومی API
lang: fa
status: approved
updated: 2026-10-09
---

# قرارداد عمومی API

این سند قرارداد لازم‌الاجرای HTTP برای Endpointهای عمومی API است. Resourceهای مثال صرفاً نمایشی
هستند و هیچ Endpoint یا مدل دامنه‌ای را تأیید یا ایجاد نمی‌کنند.

## انتخاب نسخه

- Endpointهای عمومی کسب‌وکار زیر `/api` قرار دارند و به `API-Version: 1` نیاز دارند.
- مقدار Header یک عدد صحیح مثبت ده‌دهی، بدون پیشوند `v` یا پسوند Semantic Version است.
- Header مفقود یا بدقالب پاسخ `400` می‌گیرد.
- نسخه‌ای که قالب صحیح دارد ولی پشتیبانی نمی‌شود پاسخ `406` می‌گیرد.
- همه Endpointهای کسب‌وکار تا تصمیم جداگانه درباره Breaking Change روی نسخه `1` می‌مانند.
- `GET /api/health` بدون نسخه است و به Header نیاز ندارد.

## Problem Details

همه پاسخ‌های 4xx و 5xx از Problem Details مطابق RFC 9457 و Media Type برابر
`application/problem+json` استفاده می‌کنند.

```json
{
  "type": "tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/api-version-required",
  "title": "API version is required",
  "status": 400,
  "detail": "Send the API-Version header with value 1.",
  "instance": "urn:uuid:0199b610-4a38-7000-8000-000000000001",
  "code": "API_VERSION_REQUIRED"
}
```

- `type` یک Tag URI پایدار برای نوع مشکل است که به Domain عمومی API وابسته نیست.
- `title` و `detail` متن تشخیصی انگلیسی هستند و Client نباید آن‌ها را Parse کند.
- `status` با وضعیت HTTP Response یکسان است.
- `instance` بدون افشای URL یا Secret موجود در Query String، رخداد مشخص را شناسایی می‌کند.
- `code` شناسه ماشینی پایدار با حروف بزرگ است که Client برای Branching استفاده می‌کند.
- هر Response شامل `X-Request-ID` تولیدشده توسط Server است و همان مقدار در `instance` استفاده می‌شود.
- پاسخ ناشناخته 5xx هرگز متن Exception، Stack Trace، SQL، Credential یا جزئیات داخلی را افشا نمی‌کند.

خطای Validation از کد `VALIDATION_FAILED` استفاده می‌کند و می‌تواند آرایه `errors` داشته باشد.
`pointer` یک JSON Pointer به Request document است؛ `code` پایدار و `detail` قابل خواندن برای انسان است.

```json
{
  "type": "tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/validation-failed",
  "title": "Request validation failed",
  "status": 422,
  "detail": "One or more request values are invalid.",
  "instance": "urn:uuid:0199b610-4a38-7000-8000-000000000002",
  "code": "VALIDATION_FAILED",
  "errors": [
    {
      "code": "INVALID_URL",
      "pointer": "/siteUrl",
      "detail": "Must be an absolute HTTP or HTTPS URL."
    }
  ]
}
```

JSON خراب، Header اجباری مفقود و Query با Syntax نامعتبر پاسخ `400` می‌گیرند. Body دارای Syntax
صحیح که Rule فیلدها را نقض کند پاسخ `422` می‌گیرد.

## Cursor pagination

List endpointها از Pagination رو به جلو با Cursor استفاده می‌کنند.

### Request

- `limit` اختیاری، پیش‌فرض آن ۲۵ و مقدار مجاز آن عدد صحیح بین ۱ تا ۱۰۰ است.
- `cursor` اختیاری است و برای صفحه اول ارسال نمی‌شود.
- Cursor حداکثر می‌تواند ۲۰۴۸ نویسه URL-safe داشته باشد.
- Cursor برای Client یک رشته مات و URL-safe است و Client نباید آن را Decode یا تولید کند.
- به‌جز `cursor`، درخواست‌های بعدی Filter و Sort اولیه را بدون تغییر حفظ می‌کنند.

```http
GET /api/example-resources?limit=25&cursor=opaque-value
API-Version: 1
```

### Response

```json
{
  "data": [],
  "page": {
    "size": 25,
    "nextCursor": "opaque-value"
  }
}
```

- `size` تعداد Resourceهای بازگشتی است، نه Limit درخواستی.
- `nextCursor` فقط در صورت وجود صفحه بعدی برگردانده می‌شود؛ نبودن آن یعنی پیمایش تمام شده است.
- Cursor صفحه قبل و Total دقیق بخشی از قرارداد پیش‌فرض نیستند.
- هر Endpoint ترتیب قطعی خود را مستند می‌کند و این ترتیب به یک Tie-breaker یکتا ختم می‌شود.
- Server، Cursor را به Resource، Tenant Scope، Filter و ترتیب وابسته و در برابر تغییر محافظت می‌کند.
  Cursor نامعتبر، منقضی یا ناسازگار پاسخ `400` با کد مشخص می‌گیرد.
- Cursor توکن پیمایش است، نه Bookmark دائمی؛ تغییر هم‌زمان داده می‌تواند صفحه‌های بعدی را تغییر دهد.

## Idempotency

هر Endpoint نیازمند Retry امن، اجباری‌بودن `Idempotency-Key` را صریحاً مستند می‌کند. این Header برای
Mutationهای غیر Idempotent مانند بعضی عملیات `POST` است و به‌صورت خودکار روی همه Writeها اجباری نیست.

- برای هر عملیات منطقی از مقدار یکتا و دارای Entropy بالا استفاده می‌شود؛ UUIDv4 یا UUIDv7 پیشنهاد می‌شود.
- مقدار بین ۱ تا ۱۸۰ نویسه ASCII قابل چاپ است و Whitespace ندارد.
- Scope کلید شامل Caller یا Tenant احرازشده، HTTP Method، Route استانداردشده و مقدار کلید است.
- Server یک Fingerprint رمزنگاری‌شده از Request مؤثر نگهداری می‌کند.
- Retry کامل‌شده با Key و Fingerprint یکسان، بدون تکرار Side Effect، Status و پاسخ کسب‌وکار اولیه را برمی‌گرداند.
- استفاده مجدد Key با Fingerprint متفاوت پاسخ `409 IDEMPOTENCY_KEY_REUSED` می‌گیرد.
- Request یکسانی که هنوز در حال اجراست پاسخ `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` می‌گیرد و می‌تواند
  `Retry-After` داشته باشد.
- کلید اجباری مفقود یا بدقالب پاسخ `400` می‌گیرد.
- رکورد حداقل ۲۴ ساعت قابل استفاده مجدد می‌ماند. پس از انقضا، Server ممکن است همان Key را عملیات جدید
  بداند؛ بنابراین Client نباید Key منقضی را عمداً دوباره استفاده کند.
- Authentication، Authorization، انتخاب نسخه و Validation پایه پیش از رزرو عملیات Idempotent انجام می‌شود.
- محیط مشترک و Production به Storage پایدار نیاز دارند و حافظه Process به‌تنهایی مجاز نیست.

طراحی از `draft-ietf-httpapi-idempotency-key-header-07` الهام گرفته است، ولی آن سند در تاریخ
۲۰۲۶-۰۴-۱۸ منقضی شده و RFC نیست. وضعیت آن باید پیش از پیاده‌سازی Storage دوباره بررسی شود.

## Gate پیاده‌سازی

- Version Gate، شناسه Request، پاسخ Problem Details و استثنای Health فعال هستند.
- Parser مشترک Pagination، پاسخ صفحه و ابزار Cursor رمزنگاری‌شده و وابسته به Scope فعال هستند؛ اتصال
  به Endpoint تا نخستین List Endpoint تأییدشده و قرارداد ترتیب آن منتظر می‌ماند.
- اعتبارسنجی Idempotency-Key، Fingerprint استانداردشده Request و Hash کلید Scope فعال هستند.
- بازپخش پایدار Idempotency تا تأیید Unique Constraint دیتابیس، مرز Transaction، Tenant Context،
  پاک‌سازی Retention و سیاست RLS متوقف می‌ماند.
- هیچ بخش این سند مدل دامنه یا Migration را تأیید نمی‌کند.

قرارداد اولیه قابل پردازش ماشینی در [OpenAPI 3.1](openapi.yaml) ثبت شده است. این فایل فقط Health
موجود و Componentهای قابل استفاده مجدد را دارد و عمداً شامل مسیر فرضی کسب‌وکار نیست.

## منابع

- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 4151: The `tag` URI Scheme](https://www.rfc-editor.org/rfc/rfc4151.html)
- [NestJS HTTP versioning](https://docs.nestjs.com/techniques/versioning)
- [RFC 9865 cursor pagination semantics](https://www.rfc-editor.org/rfc/rfc9865.html)
- [IETF Idempotency-Key Internet-Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

[English version](contract.en.md)
