# LA Z 1310 Admin WebApp

Administrative control plane for the LA Z 1310 digital platform.

## Architecture

```text
Admin WebApp
   |
   | Firebase Auth + App Check
   v
LA Z FastAPI /api/v1
   |
   +-- Draft + optimistic concurrency (ETag / If-Match)
   +-- Preview
   +-- Immutable Releases
   +-- Publish / Rollback
   +-- Audit
   |
   +-- Firestore / Storage / Firebase services
```

FastAPI is the source of truth. The Admin WebApp must not write directly to Firestore, Cloud Storage, FCM, or the Mobile app.

## Planned stack

- React + TypeScript + Vite
- TanStack Router and TanStack Query
- Firebase Web SDK for Auth and App Check
- OpenAPI-generated FastAPI contracts
- React Hook Form + Zod
- Tailwind CSS
- Vitest + React Testing Library + Playwright

## Security boundaries

- Never commit credentials, Firebase private keys, service-account JSON, ID tokens, App Check debug tokens, FCM credentials, or production secrets.
- Administrative authorization is enforced by FastAPI roles (`editor` / `admin`).
- PII from Dynamics participations must never be persisted in browser storage or logged.
- Draft writes must preserve the backend `ETag` / `If-Match` concurrency contract.
- A `409 Conflict` must cause reload/reconciliation, never automatic overwrite.

## Status

Foundation initialization in progress.
