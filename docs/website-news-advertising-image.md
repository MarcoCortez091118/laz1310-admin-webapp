# Website News V2 — Advertising image upload and diagnostics

**NeuroMarket · TechquilaTeam** · Issue #52

## Source-derived cause

- `WebsitePostEditorDialog` previously rendered `adImageUrl` exclusively as a text field, without an inline preview, upload control or dimensions.
- `WebsiteNewsDetailsDialog` displayed only the cover image, never the advertisement.
- The public `laz1310-website-oficial/components/PostDetail.tsx` displays `adImageUrl` inside `aspect-square`, with `object-cover`. The expected **aspect ratio is 1:1**. There is no fixed minimum pixel resolution enforced by the website source. **1080 × 1080 px is a UI recommendation**, not an existing product requirement.
- Public News consumes published legacy `posts`; the new WebAdmin editor writes only `website_post_drafts`. Saving a draft does **not** publish the advertising image. The missing asset on the live website cannot be attributed to a specific URL without the URL and browser/network error.

## Changes

- Replaces the ad URL-only input with `WebsiteAdvertisingImageField`: existing FastAPI `MediaPickerDialog` for managed upload or existing asset selection, plus optional manual HTTPS URL input.
- Displays a square preview reflecting public crop behavior. Reports natural source dimensions after load; warns when source is non-square.
- Explains actionable reasons when the image does not load: insufficient permission, expired token, broken URL, blocked hotlink, or non-image target. HTTPS URL syntax is validated before save, without exposing access credentials.
- Preserves existing `adImageUrl` in versioned WebsitePostDraft payload and requires no new endpoint or Firestore schema. Users can replace/clear the ad without changing article cover.
- Shows the public article's ad artwork in WebAdmin's read-only detail dialog (with broken-image fallback).
- Existing managed media pipeline verifies JPEG/PNG/WebP up to 5 MiB, strips metadata/re-encodes to WebP on FastAPI; WebAdmin never writes Firestore/Storage directly.

## SDLC / QA / rollout

- [ ] CI TypeScript, ESLint, Vitest, build
- [ ] Browser: paste valid public HTTPS square image → image and source dimensions visible
- [ ] Browser: invalid URL / inaccessible URL → actionable error
- [ ] Browser: upload/select JPEG/PNG/WebP → managed URL saved in `adImageUrl`; cancel/clear/change works
- [ ] Browser: non-square asset → warning and 1:1 crop preview
- [ ] Browser: reopen saved draft with ad → URL and image reappear
- [ ] Browser: article preview displays published ad, mobile release unaffected
- [ ] Website public ads require Website News publish/cutover flow (separate Issue #71); not activated by this patch

Rollback: revert Admin PR only. No backend changes, Firebase migrations, changes to native Mobile/public Website or rule deployments. Manual merge and deployment after acceptance.
