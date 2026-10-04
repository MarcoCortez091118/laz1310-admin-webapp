# Dynamics administration

The Dynamics module is a thin administrative client over the FastAPI V1 contract. It does not write to Firestore directly and does not keep local campaign fixtures.

## API contract

| Operation | Route | Role |
| --- | --- | --- |
| List Draft campaigns | `GET /api/v1/admin/dynamics` | editor/admin |
| Create or replace campaign | `PUT /api/v1/admin/dynamics/{dynamic_id}` | editor/admin |
| Remove campaign from Draft | `DELETE /api/v1/admin/dynamics/{dynamic_id}` | editor/admin |
| Read retained participant PII | `GET /api/v1/admin/dynamics/{dynamic_id}/participations` | admin only |

The list response supplies the Draft `ETag`. Every PUT and DELETE sends that exact value in `If-Match`. A stale revision is surfaced as a conflict instead of overwriting concurrent editorial changes.

PUT and DELETE return the complete updated Draft. The UI invalidates Dynamics, Draft, and Preview caches after a successful write. Changes do not affect Mobile until the existing global Publish workflow creates a new immutable release.

## Campaign editor

The editor mirrors the FastAPI `Dynamic` model:

- UUID and unique slug
- title, artwork label, context, description, instructions and image URL
- aware campaign window stored as UTC and edited in the campaign IANA timezone
- `active` / `closed` editorial state and a single catalog-wide `featured` campaign
- native form or external HTTPS registration URL
- optional Firebase authentication for native forms
- up to 12 `text`, `email`, `phone`, or `textarea` fields
- terms URL, privacy URL and consent version

Client validation mirrors the important API invariants, but FastAPI remains authoritative.

Anonymous native forms must contain a required email or phone field. External participation cannot contain local fields or require local authentication. The editor prevents selecting a second featured campaign before sending a request.

## Participants

Participant access is intentionally separated from campaign editing. The page uses the server cursor contract (`limit=20&after=UUID`) and continues until `nextCursor` is null.

Participant values are rendered as text. The client never logs them and never stores them in local application state outside the active query cache. The backend performs the authoritative admin-role check, rate limit, decryption, retention filtering and audit write before returning PII.

The optional CSV action exports only rows that the administrator has already loaded in the current browser session; it is not a server-side bulk export and does not bypass pagination or auditing.

## Existing test campaign

The module intentionally contains no hard-coded test campaign. Any existing test Dynamic is loaded from `GET /api/v1/admin/dynamics` and is edited through the same production contract as every other campaign.
