# Website administration workspace — NeuroMarket TechquilaTeam

**Status:** Proposed design only; does not add routes or modify current Mobile admin flows.

## UX / product boundary

The existing staff WebAdmin is the single control plane with independent navigation areas:

- **Mobile** (existing unchanged): Home/Pages/Banners, Radio, Programs, Dynamics/Participants, Notifications, Users, Branding, Media.
- **Website** (new): News/Blog, desktop and mobile **web layout** banners, Popup, Tickets creatives, Reels, Gallery and Website Media. Later: web entrant records and ticket registration operations.
- Shared safe infrastructure surfaces may include staff authentication and media picker, but API resources must be separate and access-scoped.

Website changes **must not** appear in Mobile page editor or alter Mobile published releases. Publishing Website must not publish Mobile Dynamics or trigger native push notifications.

## Integration contract

- Protected calls to the existing FastAPI host; Firebase Auth ID token + Firebase App Check; admin/editor capabilities checked by backend, not only UI.
- WebAdmin has **no** direct Firebase Firestore, Storage or FCM SDK read/write data pathway for website content.
- Distinct `/api/v1/admin/website/*` and public `/api/v1/website/*` routes, subject to API ADR approval.
- Use Website-specific Query Keys to prevent cross-domain invalidation; schema types generated from the API OpenAPI contract.
- Draft -> Preview -> Publish -> immutable Website Release; `If-Match` revision on mutation, explicit 409 reconciliation, permissions and rollback.
- Reuse the modal-first create/edit and shared managed-media picker pattern, but scope uploads/deletions to Website media prefixes.

## Incremental vertical slices

1. **Website News / Blog**: editorial list, search/filter, modal editor for metadata and fullArticle; managed image; stable SEO slug; preview/publish; public page read adapter. Import existing `posts` read-only first.
2. **Website Banners / Popup**: separate desktop/mobile website artwork, position, links, timing and activation; no shared Mobile banners.
3. **Website Gallery / Reels**: real upload/view/edit/reorder, referenced media lifecycle and playback validation.
4. **Website Tickets + Registrations**: creative publishing separated from transactional registrations; protect PII; deduplicate, consent and reconcile n8n before migrating writes.
5. **Website roles + audit + cutover**: explicit web permissions, logs, release history, rollback, turn off legacy AdminPortal only after acceptance.

## Quality and safety gates

For each slice, start from updated main with Issue + new branch + Draft PR, conventional commits, quality CI and acceptance. QA includes protected auth, roles, loaded/empty/error UI, keyboard/modal accessibility, Responsive, staging website SEO, API 404/409, native Mobile content-version unchanged, and rollback. Never auto-merge.

## UI acceptance

- No oversized scroll-to-create inline forms: create/edit use focused dialogs with validation and cancellation isolation.
- Bulk content tables are searchable, sortable or filterable only according to the real server contract; avoid claiming globally searched data when results are client-filtered.
- Published/Draft/Unpublished status is unmistakable; disabled actions explain missing permissions.
- Preserve original website links, content, media references and existing public rendering until separately approved.
- Old website dashboard hardcoded numbers must **never** be displayed as real metrics in the new Admin.
