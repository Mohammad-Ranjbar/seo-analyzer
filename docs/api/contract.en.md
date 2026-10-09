---
title: Public API Contract
lang: en
status: approved
updated: 2026-10-09
---

# Public API Contract

This document is the binding HTTP contract for public API endpoints. Examples use placeholder
resources; they do not approve or create a domain endpoint.

## Version selection

- Public business endpoints live below `/api` and require `API-Version: 1`.
- The header value is one positive base-10 integer without a `v` prefix or semantic-version suffix.
- A missing or malformed header returns `400`.
- A well-formed but unsupported version returns `406`.
- All business endpoints remain on version `1` until a separate breaking-change decision is made.
- `GET /api/health` is version-neutral and does not require the header.

## Problem Details

All 4xx and 5xx responses use RFC 9457 Problem Details and the
`application/problem+json` media type.

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

- `type` is a stable tag URI identifying the problem class without depending on a public API domain.
- `title` and `detail` are English diagnostic text and must not be parsed by clients.
- `status` matches the HTTP response status.
- `instance` identifies this occurrence without exposing a URL or query-string secret.
- `code` is a stable uppercase machine identifier used for client branching.
- Every response includes a server-generated `X-Request-ID`; its value is used by `instance`.
- Unknown 5xx responses never expose exception messages, stack traces, SQL, credentials, or internals.

Validation failures use code `VALIDATION_FAILED` and may add an `errors` array. `pointer` is a JSON
Pointer into the request document; `code` is stable and `detail` is human-readable.

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

Malformed JSON, missing required headers, and invalid query syntax return `400`. A syntactically
valid body that violates field rules returns `422`.

## Cursor pagination

List endpoints use forward-only cursor pagination.

### Request

- `limit` is optional, defaults to 25, and must be an integer from 1 through 100.
- `cursor` is optional and omitted for the first page.
- A cursor may contain at most 2,048 URL-safe characters.
- The client treats the cursor as an opaque, URL-safe string and must not decode or construct it.
- Except for `cursor`, subsequent requests retain the original filter and sort parameters.

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

- `size` is the number of resources returned, not the requested limit.
- `nextCursor` is present only when another page exists. Its absence means traversal is complete.
- Previous-page cursors and exact total counts are not part of the default contract.
- Every endpoint documents a deterministic order ending in a unique tie-breaker.
- The server binds the cursor to the resource, tenant scope, filters, and order, and protects it
  against modification. Invalid, expired, or mismatched cursors return `400` with a specific code.
- A cursor is a traversal token, not a permanent bookmark. Concurrent updates may change later pages.

## Idempotency

An endpoint that requires safe retries explicitly documents `Idempotency-Key` as required. The
header is intended for non-idempotent mutations such as selected `POST` operations; it is not
automatically required on every write.

- Use a unique, high-entropy value for each logical operation; UUIDv4 or UUIDv7 is recommended.
- The value is 1 to 180 printable ASCII characters and must not contain whitespace.
- A key is scoped by authenticated caller or tenant, HTTP method, canonical route, and key value.
- The server stores a cryptographic fingerprint of the effective request.
- A completed retry with the same key and fingerprint returns the original status and business
  response without repeating the side effect.
- Reusing a key with a different fingerprint returns `409 IDEMPOTENCY_KEY_REUSED`.
- A matching request that is still executing returns `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` and may
  include `Retry-After`.
- Missing or malformed required keys return `400`.
- Records remain reusable for at least 24 hours. After expiry, clients must treat a reused key as a
  new operation and therefore must not intentionally reuse expired keys.
- Authentication, authorization, version selection, and basic request validation happen before an
  idempotent operation is reserved.
- Shared and production environments require durable storage. Process memory alone is prohibited.

The design is informed by `draft-ietf-httpapi-idempotency-key-header-07`, but that document expired
on 2026-04-18 and is not an RFC. Its status must be rechecked before the storage implementation.

## Implementation gate

- The version gate, request identifier, Problem Details response, and health exception are active.
- Shared pagination parsing, page responses, and encrypted scoped cursor primitives are active;
  endpoint integration waits for the first approved list endpoint and its ordering contract.
- Idempotency-Key validation, canonical request fingerprints, and scoped-key hashes are active.
- Durable idempotency replay waits for approval of its database uniqueness constraint, transaction
  boundary, tenant context, retention cleanup, and RLS policy.
- No item in this document approves a domain model or migration.

The initial machine-readable contract is [OpenAPI 3.1](openapi.yaml). It includes only the existing
health endpoint and reusable components; placeholder business paths are intentionally absent.

## References

- [RFC 9457: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 4151: The `tag` URI Scheme](https://www.rfc-editor.org/rfc/rfc4151.html)
- [NestJS HTTP versioning](https://docs.nestjs.com/techniques/versioning)
- [RFC 9865 cursor pagination semantics](https://www.rfc-editor.org/rfc/rfc9865.html)
- [IETF Idempotency-Key Internet-Draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)

[Persian version](contract.fa.md)
