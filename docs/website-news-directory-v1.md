# Website News directory — Phase 1 (read only)

**NeuroMarket TechquilaTeam** · Related Issue #46, dependent FastAPI issue #65.

- `/website/news` is a distinct navigation group and page; it never invokes Mobile `/api/v1/admin/pages` or Mobile draft/publish methods.
- Staff ID token and Firebase App Check are carried by the existing `apiRequest` wrapper. Editor and admin roles are enforced by FastAPI, not a client-side toggle.
- The listing calls `GET /api/v1/admin/website/posts?limit=20&after=...`, supports loading additional pages and filters **only loaded** headline/category/summary/id. API always orders by descending legacy timestamp.
- The row detail dialog displays the legacy article as **plain text** (not injected HTML), metadata, image URL and source link. This is a read-only preview; not an editor or a website publication.
- Error states communicate that the API must be deployed first; no client Firestore/Storage API is imported.

## Acceptance

1. Build, lint, typecheck and tests pass.
2. Authenticated editor/admin reads from the deployed API; nonstaff denied.
3. Test loaded/empty/error, paging, responsive widths, keyboard dialog close and existing Mobile pages intact.
4. Coordinate release with API PR. WebAdmin PR remains Draft until API route is live in staging.

## Rollback

Hide/remove the additive Website navigation/route; no Mobile state or Firebase data migration.
