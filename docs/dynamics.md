# Dynamics administration

## Purpose

The Dynamics workspace manages contests, promotions, giveaways, and other audience participation campaigns that are delivered to Mobile through the standard Draft → Publish → immutable Release pipeline.

FastAPI remains the source of truth. The browser never writes directly to Firestore and never decrypts participation records itself.

## Contracts

Administrative definition endpoints:

- `GET /api/v1/admin/dynamics`
- `PUT /api/v1/admin/dynamics/{dynamic_id}`
- `DELETE /api/v1/admin/dynamics/{dynamic_id}`
- `GET /api/v1/admin/dynamics/{dynamic_id}/participations`

Definition writes require the current Draft `ETag` through `If-Match`.

## Dynamic definition

The editor covers the complete backend contract:

- title and stable slug;
- artwork label and context;
- description and instructions;
- managed HTTPS artwork;
- start / end window;
- IANA timezone;
- featured state;
- active / closed editorial state;
- participation mode;
- terms URL;
- privacy URL;
- consent version.

### Scheduling

FastAPI persists aware datetimes in UTC. The WebAdmin displays and accepts editorial local date/time using the Dynamic's configured IANA timezone (normally `America/Detroit`) and converts it to an ISO UTC instant before saving.

Campaign duration must be positive and no longer than 366 days.

## Participation modes

### Internal form

A form supports up to 12 fields. Field keys must match:

```text
^[a-z][a-z0-9_]{0,39}$
```

Supported field types:

- text;
- email;
- phone;
- textarea.

If authentication is not required, the backend requires at least one required email or phone field. This prevents anonymous submissions without a stable duplicate-detection contact channel.

### External URL

External participation requires a public HTTPS URL and cannot include local form fields or local authentication requirements.

## Media

The preferred artwork flow is the shared Media Library picker:

```text
WebAdmin
  ↓
Admin Media API
  ↓
Image validation / metadata stripping / WebP conversion
  ↓
Google Cloud Storage
  ↓
Dynamic.imageUrl
```

Existing external HTTPS artwork remains supported for backward compatibility.

## PII / participations

Participation definitions are editable by normal staff roles allowed by FastAPI. Decrypted participation records are different: FastAPI requires `admin` through `ParticipationReader` and separately rate-limits PII reads.

The WebAdmin therefore:

- only exposes the Participations action to `admin`;
- never stores participation values in localStorage, sessionStorage, IndexedDB, or URLs;
- provides no CSV/export action in this vertical;
- does not log participation values;
- removes the participation TanStack Query cache when the protected panel closes;
- surfaces API request IDs and rate-limit errors for support diagnostics.

The server remains authoritative for encryption, decryption, retention, duplicate detection, and consent evidence.

## Consent evidence

Each accepted participation contains evidence tied to the submitted campaign definition, including:

- terms accepted;
- privacy accepted;
- consent version;
- terms URL;
- privacy URL;
- acceptance timestamp.

Changing terms or privacy URLs in a future Draft does not rewrite historical evidence.

## Publication semantics

Saving a Dynamic only increments the Draft revision. The Mobile app continues using the current immutable release until an administrator explicitly publishes.

```text
Edit Dynamic
   ↓
Draft + If-Match
   ↓
Preview
   ↓
Publish
   ↓
Immutable Release
   ↓
Mobile
```

Closing a campaign in Draft does not affect the currently published release until Publish. Runtime public status also respects the configured start/end window.

## Failure handling

- Missing Draft ETag disables writes.
- `409 Conflict` requires explicit Draft reload and reconciliation.
- Client-side validation is only early feedback; FastAPI remains authoritative.
- Invalid MIME/image bytes, unsafe dimensions, campaign rules, consent rules, authorization, and quotas remain server-side enforcement points.
