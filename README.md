# Persian SEO Analyzer API

API-first SEO analysis platform for Persian online stores, built with NestJS 12 and designed around PostgreSQL.

> **Project status: design and approval phase.** The business model and conceptual database model are approved. Application features, database migrations, and production integrations have not been implemented yet.

[مستندات فارسی](#فارسی) · [English documentation](#english) · [Project documentation](docs/index.en.md) · [GitHub repository](https://github.com/Mohammad-Ranjbar/seo-analyzer)

## فارسی

این پروژه یک سرویس API برای تحلیل و بهبود SEO فروشگاه‌های آنلاین فارسی‌زبان در بازار ایران است. کاربر پس از ساخت سازمان، Workspace و پروژه SEO، دامنه اصلی و رقبای خود را معرفی می‌کند یا پیشنهادهای سیستم را تأیید می‌کند. سامانه با Crawl محدود و مسئولانه، وضعیت فنی و محتوایی قابل استخراج را تحلیل و پیشرفت سایت را در طول زمان اندازه‌گیری خواهد کرد.

### دامنه MVP

- دریافت محصول از API یا Crawl صفحات محصول و دسته‌بندی
- تولید پیشنهادهای SEO براساس عنوان، برند و دسته‌بندی
- Crawl دستی، هفتگی یا ماهانه با HTML-first و Headless fallback محدود
- ثبت و تحلیل رقبا با تأیید کاربر
- مقایسه کلی سایت با رقبا و نگهداری تاریخچه امتیازها
- Action Item با وضعیت کاربر و نتیجه فنی مستقل
- API Key محدود به Workspace، پروژه و Permission
- Polling و Webhook امضاشده
- هسته Rule-based و AI اختیاری از طریق مدل محلی یا BYOK
- اندازه‌گیری مصرف بدون Billing در MVP

هیچ ابزار پولی خارجی جزو وابستگی الزامی MVP نیست.

### وضعیت طراحی

- مدل کسب‌وکار: تأییدشده
- مدل مفهومی PostgreSQL: تأییدشده
- ERD: ۵۴ جدول، ۹۱ رابطه و صفر Problem در drawDB
- ADRها: ۱۲ تصمیم معماری پذیرفته‌شده
- PRD، نمای معماری و فرهنگ داده: در انتظار بازبینی نهایی
- پیاده‌سازی برنامه و Migrationها: شروع نشده

### مستندات

- [راهنمای مستندات فارسی](docs/index.fa.md)
- [طرح کسب‌وکار](docs/business/business-plan.fa.md)
- [نیازمندی‌های محصول](docs/product/prd.fa.md)
- [مدل مفهومی دیتابیس](docs/database/conceptual-model.fa.md)
- [راهنمای ERD و فایل‌های drawDB](docs/database/README.fa.md)
- [فرهنگ داده](docs/database/data-dictionary.fa.md)
- [تصمیم‌های معماری](docs/architecture/adr/README.fa.md)
- [چک‌لیست تأیید طراحی](docs/review/design-approval-checklist.fa.md)

پوشه `docs/` یک Vault محلی سازگار با Obsidian است. تنظیمات شخصی `.obsidian/` عمداً در Git نگهداری نمی‌شوند.

## English

Persian SEO Analyzer is an API-first service for analyzing and improving the SEO of Persian-language online stores in Iran. A user creates an organization, workspace, and SEO project; defines the primary website; and supplies competitors or approves system suggestions. The planned system performs constrained crawling, evaluates extractable technical and content signals, and measures progress over time.

### MVP scope

- Product ingestion through the API or product/category crawling
- SEO suggestions based on product title, brand, and categories
- Manual, weekly, or monthly HTML-first crawling with constrained headless fallback
- User-approved competitor discovery and tracking
- Site-level competitor comparison with score history
- Action items with separate user workflow and technical verification states
- Workspace API keys restricted by project and permission
- Polling and signed webhooks
- Rules-first core with optional local-model or BYOK AI
- Usage metering without MVP billing

No paid third-party service is a mandatory MVP dependency.

### Design status

- Business model: approved
- PostgreSQL conceptual model: approved
- ERD: 54 tables, 91 relationships, and zero drawDB problems
- ADRs: 12 accepted architecture decisions
- PRD, architecture overview, and data dictionary: awaiting final review
- Application implementation and migrations: not started

### Documentation

- [Documentation guide](docs/index.en.md)
- [Business plan](docs/business/business-plan.en.md)
- [Product requirements](docs/product/prd.en.md)
- [Conceptual database model](docs/database/conceptual-model.en.md)
- [ERD and drawDB artifacts](docs/database/README.en.md)
- [Data dictionary](docs/database/data-dictionary.en.md)
- [Architecture decisions](docs/architecture/adr/README.en.md)
- [Design approval checklist](docs/review/design-approval-checklist.en.md)

## Technology baseline

- [NestJS 12](https://docs.nestjs.com/)
- TypeScript with native ESM
- PostgreSQL with a shared schema and Row-Level Security
- Vitest for tests
- oxlint and Prettier for static checks and formatting
- Obsidian-compatible Markdown documentation
- drawDB with versioned DBML and JSON exports

The ORM, queue implementation, production SMS provider, and optional AI providers are intentionally undecided until their corresponding design reviews are approved.

## Local starter commands

The repository currently contains the generated NestJS starter plus approved documentation. These commands operate on the starter; they do not provide the planned SEO features yet.

```bash
npm install
npm run start:dev
```

Available checks:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Repository

```bash
git clone https://github.com/Mohammad-Ranjbar/seo-analyzer.git
cd seo-analyzer
npm install
```

## License

This repository is currently marked as `UNLICENSED` and is not offered under an open-source license.
