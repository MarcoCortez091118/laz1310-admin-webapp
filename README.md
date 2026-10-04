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

## Stack

- React + TypeScript + Vite
- TanStack Router and TanStack Query
- Firebase Web SDK for Auth and App Check
- OpenAPI-generated FastAPI contracts
- React Hook Form + Zod
- Tailwind CSS + Lucide React
- Vitest + React Testing Library

## Security boundaries

- Never commit credentials, Firebase private keys, service-account JSON, ID tokens, App Check debug tokens, FCM credentials, or production secrets.
- Administrative authorization is enforced by FastAPI roles (`editor` / `admin`).
- PII from Dynamics participations must never be persisted in browser storage or logged.
- Draft writes must preserve the backend `ETag` / `If-Match` concurrency contract.
- A `409 Conflict` must cause reload/reconciliation, never automatic overwrite.
- The browser does not write directly to Firestore, Cloud Storage, or FCM.

## Current implementation

Implemented:

- Firebase email authentication + App Check;
- FastAPI staff authorization (`editor` / `admin`);
- Overview / Draft status;
- Pages editor with Live Preview and Server Draft Preview;
- Programs editor backed by Station `Show` + `Schedule` contracts;
- Media Library with secure image upload/listing and reusable Programs artwork picker;
- Publish + immutable Releases + ETag-protected Rollback administration;
- optimistic concurrency and request-id aware error handling;
- OpenAPI-generated API types in CI.

Planned administration surfaces already represented in navigation:

- Radio;
- Dynamics;
- Weather;
- Notifications;
- Audit;
- App Configuration.

See `docs/architecture.md` for platform boundaries, `docs/programs.md` for the Programs workflow, `docs/media-library.md` for the managed image pipeline, and `docs/releases.md` for Publish / Release / Rollback semantics.
