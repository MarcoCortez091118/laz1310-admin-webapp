# Website News V1 · Cursor paginated editorial table

**NeuroMarket TechquilaTeam** · Issue #48 · Front-end only, no API or Firebase changes.

## Problem and UX decision

The original News/Blog directory appended each fetched page to a long continuous table, requiring excessive scrolling and displaying long Firestore document IDs prominently. This first read-only phase should be as navigable as the existing Users directory, but adapted to articles.

## Interface and behavior

- One compact page of editorial articles at a time, using the actual FastAPI `GET /api/v1/admin/website/posts?limit=N&after=<opaque>` contract.
- `N` is 10, 20 or 50. The default remains 20; changing page size creates a separate TanStack Query cache entry and resets to page 1.
- **Next:** moves immediately when the next page is cached; otherwise calls the API using `nextCursor`. On failure, stays on the current page and shows Retry.
- **Previous:** navigates only previously loaded pages without requesting another page.
- **Last page:** Next disabled when there is no cursor and no cached next page.
- Total count remains *unknown*. Page N, loaded article count and currently visible rows are accurate; never fabricate a Firestore-wide total or numbered arbitrary page navigation.
- Search/title/category/source/slug filtering applies **only to the current loaded page** and resets on navigation and rows-per-page changes. No server-side search contract has been introduced.
- Multi-select columns for Category, Date, Source and Article ID. Article preview and title are always shown. Legacy IDs are tooltip-truncated by default, preserving values.
- Read-only preview dialog retains plain-text body; source links are restricted to HTTP(S). No HTML injection or editorial write permissions.

## Architecture

- `WebsiteNewsPage`: query state, cursor/rows-per-page navigation and data-loading/error handling.
- `WebsiteNewsTable`: presentational, compact image/title/category/date/source/ID action table.
- `WebsiteNewsDetailsDialog`: scoped read-only modal.
- `model.ts`: pure current-page filters, category derivation, last-page logic and date display.

No changes to Mobile pages, broadcasts, Firebase, Storage, website public frontend, API routes, publishing or existing App Check authentication.

## Verification

CI requires `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Vitest covers current-page filtering, category derivation, cursor-based next eligibility, and handling of legacy dates. Browser acceptance still required using real Website posts: latest 20, next and previous navigation, 10/50 sizes, empty filter/last page, mobile view, keyboard/tab navigation, and 503/timeout recovery.

## Deployment / rollback

This PR is independent of backend migrations and relies only on Website News V1 already deployed. Revert the WebAdmin PR to restore the original load-more display. No data changes or backend rollback required. Merge remains manual after code review and browser QA.
