# Admin WebApp architecture

## Source of truth

FastAPI owns all business rules and persistent mutations.

```text
Admin WebApp
  -> Firebase Auth / App Check
  -> FastAPI /api/v1
  -> Draft
  -> Publish
  -> Immutable Release
  -> Mobile / Public Web
```

The browser must not write directly to Firestore, Cloud Storage, FCM, or mobile data stores.

## Concurrency

Editorial writes use the backend Draft revision exposed as an HTTP `ETag`.

1. Read `GET /api/v1/admin/draft`.
2. Store its `ETag`.
3. Send that exact value in `If-Match` for the next editorial mutation.
4. Replace the local ETag with the response ETag after a successful write.
5. On `409 Conflict`, stop. Reload and explicitly reconcile. Never automatically overwrite.

## Authentication and authorization

Firebase authenticates the operator. The browser sends the Firebase ID token and App Check token to FastAPI. FastAPI remains authoritative for the signed `laz_roles` claim and for editor/admin authorization.

Frontend route visibility is UX only, never an authorization boundary.

## PII

Dynamics participation PII may be returned only to authorized admins through FastAPI.

The browser must not:
- persist participation payloads in localStorage, sessionStorage or IndexedDB;
- put PII in URLs;
- log PII to console or analytics;
- include PII in error telemetry.

## OpenAPI

Backend response/request models must be generated from live FastAPI OpenAPI rather than manually duplicated.

```bash
OPENAPI_URL=https://<api-host>/openapi.json npm run api:generate
```

Generated contracts are intentionally ignored until the live environment used by CI is selected. Business feature PRs must generate/use the relevant contract before implementation.

## Error semantics

The application preserves backend semantics for:
- 401 unauthenticated
- 403 forbidden
- 409 concurrency conflict
- 413 payload too large
- 422 validation
- 429 rate limited, including Retry-After
- 5xx dependency/service failure

`X-Request-ID` should be surfaced in support/error UI when available.
