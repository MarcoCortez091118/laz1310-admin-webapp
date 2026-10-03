# Media Library

The Media Library is the Admin WebApp surface for editorial image assets consumed by app content such as Programs.

## Source of truth

The browser never writes directly to Google Cloud Storage. All media operations cross the authenticated FastAPI administrative boundary:

```text
Admin WebApp
   |
   | Firebase ID token + App Check
   v
PUT /api/v1/admin/media/{asset_id}?alt=...
GET /api/v1/admin/media
   |
   v
FastAPI media service
   |
   +-- MIME and size validation
   +-- image decoding / safety validation
   +-- EXIF transpose
   +-- metadata removal
   +-- WebP re-encode
   +-- immutable asset reservation
   v
Google Cloud Storage + Firestore metadata
```

## Upload contract

The UI mirrors the backend contract for early feedback, while FastAPI remains authoritative.

Accepted request MIME types:

- `image/jpeg`
- `image/png`
- `image/webp`

Current backend constraints include:

- 1 byte to 5 MiB source payload;
- actual decoded format must match `Content-Type`;
- maximum image edge of 8192 px;
- maximum 16,000,000 pixels;
- animated images are rejected;
- processed output must remain at or below 5 MiB;
- alt/description is required and limited to 500 characters.

Accepted images are re-encoded as WebP without original EXIF/location metadata or appended payloads.

## Idempotency and ambiguous failures

The backend treats `asset_id` as immutable. The WebAdmin generates one UUID when a file is selected and keeps that UUID for subsequent manual retries of the same upload attempt.

This matters when a network timeout happens after the server may already have accepted the upload: reusing the UUID allows the backend reservation logic to return the same record instead of creating a duplicate asset.

A new UUID is created only after selecting a different file or after a successful upload.

## Listing and pagination

The library reads:

```http
GET /api/v1/admin/media?limit=24&after=<uuid>
```

The UI uses cursor pagination and local search over the currently loaded asset descriptions/IDs. It does not fabricate server-side search semantics that the API does not expose.

There is intentionally no Delete action because the current FastAPI Media contract does not expose a delete endpoint.

## Programs integration

The Programs editor can open the reusable `MediaPickerDialog` to:

1. browse managed media;
2. upload a new asset;
3. select an asset;
4. place the selected managed URL into `Show.imageUrl`;
5. save the Program through the existing Station Draft + `If-Match` flow.

Selecting an image does not publish content. It only changes the local Program working copy until the Program is saved to Draft. Mobile continues consuming the immutable published release until the normal Publish workflow runs.

## Security notes

- Firebase Auth and App Check continue to be attached by the shared API client.
- FastAPI remains authoritative for `editor` / `admin` authorization and upload quotas.
- Client validation is usability-only; the server verifies bytes, type and dimensions.
- External image rendering uses `referrerPolicy="no-referrer"`.
- Media download URLs are not stored in browser persistence by this feature.
- API errors can surface `X-Request-ID` for operational tracing.
- Rate-limit responses preserve `Retry-After` feedback where available.

## Follow-up

A future backend contract may add lifecycle operations such as deletion/archival or server-side media search. Those capabilities should be added to FastAPI first and then surfaced here through generated OpenAPI contracts.
