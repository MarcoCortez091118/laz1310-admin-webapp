# Website News V3 — Preview, Publish/Update and Rollback control plane

**Issue #54**, depends on FastAPI PR #73 and public Website PR (News canary).

## Editorial workflow

Website → News/Blog → Drafts → Edit draft → Save (existing V2) → **Preview / Publish**. Preview opens the actual protected FastAPI draft (including cover/advertising). A verified `admin` can confirm `Publish article` for an unpublished article or `Update published article` for an existing release.

Every publish uses the **saved draft revision as If-Match**. A release is committed atomically to the Website-only history and snapshot collection; it is separate from Mobile `public_state/current` and Mobile releases. `409` requires fetching a new draft; the UI never silently overwrites another editor's changes.

`Release history` shows immutable versions. An admin may restore an older release with `If-Match` equal to the **current publication revision**. Rollback creates a new public revision and preserves current editorial drafts. Editor-role accounts may view preview/history but cannot publish or rollback; backend separately enforces admin.

## Public website and deployment gating

A successful FastAPI publication does NOT by itself cause the current public website to display this release. The website must be explicitly configured to use the approved, public Website feed behind the separate staged feature flag in the Website repository. Disable that flag to revert to the legacy Firestore reader. The legacy AdminPortal will be removed in a later, separately approved authority-cutover PR; no new direct Firestore writes are introduced here.

## Verification

- [ ] npm typecheck/lint/test/build.
- [ ] FastAPI #73 deployed first; Firebase auth, App Check and admin/editor role checks with real staging identities.
- [ ] Creating and publishing a draft twice yields one release and 409 on duplicate; update after edit yields revision N+1.
- [ ] Historical rollback creates another release; mobile `content-version`, native released content, devices and notifications unchanged.
- [ ] Verify Website site flag activation, news/archive/detail/ad/source URL, CORS/cache and SEO in staging before public cutover.
- [ ] Manual merge/deploy; no automatic live publication.

Rollback: undo WebAdmin UI deployment; leave immutable publication evidence and staged public reader intact. No data deletion.
