# Publish, Releases, and Rollback

The Releases workspace is the administrative control plane for promoting Draft content to Mobile.

## Source of truth

FastAPI owns all release mutations. The browser never writes release state directly to Firestore.

```text
Draft
  |
  | POST /api/v1/admin/publish
  | If-Match: <Draft revision>
  v
Immutable content_releases/{release_id}
  |
  +-- content_release_history/{release_id}
  |
  v
public_state/current
  |
  v
Mobile / public API
```

## Publish

Publishing requires the `admin` role and a non-empty release note.

The request uses the Draft ETag. A stale Draft produces `409 Conflict`; the UI requires an explicit reload and never overwrites newer editorial work.

The backend validates the complete catalog before creating a release. A successful publish creates an immutable release and moves `public_state/current` to that release.

Publishing does not edit the Draft.

## Release history

`GET /api/v1/admin/releases` exposes the immutable release history using cursor pagination (`limit` + `after`).

The history response currently has an untyped `Document` OpenAPI contract, so the WebAdmin parses it defensively before rendering. Expected fields are:

- `id`
- `sourceRevision`
- `publishedAt`
- `publishedBy`
- `note`

Malformed history documents are rejected by the client rather than trusted implicitly.

## Rollback

Rollback requires the `admin` role, a selected historical release, and a required reason.

Unlike Publish, rollback concurrency is based on the **PublicState ETag**, not the Draft ETag:

```text
POST /api/v1/admin/releases/{release_id}/rollback
If-Match: <PublicState revision>
```

The backend verifies that the target release still exists and is publication-valid, then changes only the public release pointer.

Rollback does not delete or mutate any immutable release and does not alter the Draft.

## Security and reliability

- FastAPI remains authoritative for `admin` authorization.
- Firebase ID token and App Check flow through the shared API client.
- Publish and rollback require the correct optimistic-concurrency ETag.
- A `409 Conflict` always requires reload/reconciliation.
- Release and rollback notes are limited to 300 characters by the backend contract.
- Request IDs are surfaced for operational tracing.
- No release state or credentials are persisted in browser storage.

## UX rules

The Releases page:

- distinguishes Draft revision from PublicState revision;
- shows whether the current Draft matches the active release;
- requires a note before Publish;
- disables rollback for the active release;
- requires a second explicit rollback confirmation with a reason;
- clearly states that rollback changes the Mobile/public pointer without rewriting history.
