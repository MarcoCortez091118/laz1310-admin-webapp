# Website News V2 — Draft-first editorial workspace

**NeuroMarket · TechquilaTeam** · Issue #50 · depends on FastAPI PR #70

## Use
Website → News/Blog keeps the already-paginated list of public legacy articles. `Create article draft` opens a focused modal for an unpublished new article. Existing public article rows have an `Edit` action that loads an existing versioned Website draft; if absent, the editor offers to **import the legacy article on Save**. Explicit import is an audited create; Cancel before Save has no data effect.

A Website Drafts list presents saved articles not yet present in the legacy public catalog, including their revision, origin and `Continue editing`.

Fields match the actual legacy `posts` model: headline, category, summary, full article, imageUrl, sourceName, sourceUrl, adImageUrl. New slug is normalized; existing slugs cannot change. Images use the existing FastAPI-backed managed-media upload/selection, not browser Firestore or Storage writes. Published URL compatibility is preserved by keeping immutable slug identity.

## API contracts

- `GET /api/v1/admin/website/drafts?limit=20&after=<slug>`
- `GET /api/v1/admin/website/posts/{slug}/draft` returns ETag quoted revision
- `POST /api/v1/admin/website/posts/{slug}/draft/import` requires If-Match `"0"`
- `PUT /api/v1/admin/website/posts/{slug}/draft` requires If-Match `"<revision>"`, returns next revision

All use existing Firebase Auth and App Check via `apiRequest`. FastAPI enforces editor/admin and content validators. 409 conflicts display a reload warning and are never overwritten automatically.

## Deliberate no-impact boundary

**This PR does not publish anything**. FastAPI writes only `website_post_drafts` plus audited metadata. Existing legacy `posts` remain public and mutable through the old admin until an approved authority cutover. Mobile `content_drafts`, `public_state`, Dynamics, radio, notifications and Storage roles are untouched.

The MediaPicker currently shares managed media across modules; this V2 draft slice does **not** grant deletion of assets or transfer asset ownership. Publishing will require Website-scoped media ownership/cleanup validation.

## Deployment gates and QA

1. Validate FastAPI PR CI; merge/deploy API first.
2. Verify new article save, resume and update, and importing an existing article without changing `posts`. Verify revisions 0→1→2 and 409 on stale version, 428 missing If-Match; staff authorization.
3. Validate WebAdmin CI, browser/modal keyboard and mobile layout, image upload from managed Media Library.
4. Verify old `laz1310.com` news and Mobile content-version are unchanged.
5. Human review and manual merge. No automatic deploy. A rollback reverts Admin view and API routes without deleting editorial drafts.

## Future separate gates

Website Publish/Release/Rollback requires immutable `website_*` releases and safe migration away from the legacy AdminPortal writes; no direct production writes until a staged, backed-up cutover is accepted.
