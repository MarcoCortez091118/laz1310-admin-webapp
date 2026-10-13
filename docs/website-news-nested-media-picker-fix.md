# Website News V2 — Nested image picker regression

**Issue #56** · Frontend-only correction in LAZ1310 WebAdmin.

## Incident and diagnosed source-level cause

The Website Post editor is an MUI `<Dialog>` with its own backdrop, focus trap and modal manager. Both the cover-image chooser and the Article Advertising chooser rendered a second, native `<dialog>` element invoking `showModal()`. This produced two different modal and focus-management systems nested inside one another; modal layering/focus could prevent users interacting with the asset selection and upload controls. The user reported that choosing advertising artwork while editing a draft did not work. We have not captured a browser console trace, so the modality conflict is the strongest source-level diagnosis, not a claimed production reproduction.

Additionally, MediaAssetGrid displayed a thumbnail that looked clickable but actually had no interaction; users had to click a separate `Use image` button, and selecting an already-selected item was disabled.

## Changes
- `MediaPickerDialog` now uses a nested MUI Dialog (portal and ModalManager) rather than a browser native dialog. Unique React `useId()`-based accessible title; MUI manages Escape/backdrop, focus and modal stacking with the parent editor.
- Existing library fetch, search, Upload tab, upload transaction and `asset.url` -> editor change contract are unchanged.
- Thumbnails now expose a real accessible button; both thumbnail and `Use image` choose the asset. Selecting the existing image can close the picker normally.
- Unusable or non-HTTPS remote media URLs are rejected with a visible error instead of silently closing.
- Advertising field visibly confirms `Selected from Media Library` and instructs the editor to click `Save Website draft` to persist the URL. Preview and 1:1 guidance are unchanged.
- `MediaAssetGrid` and media URL validation have unit/SSR tests. Legacy media-library copy-only cards remain read-only.

## SDLC / acceptance checklist
- [ ] GitHub CI lint, TypeScript, Vitest, build
- [ ] QA in browser: open Website News -> saved draft -> Upload / Choose ad -> choose existing thumbnail -> picker closes -> ad URL updates -> image preview -> Save Website draft -> reopen, URL still present
- [ ] QA in browser: open Upload tab, choose JPEG/PNG/WebP, enter accessible description, complete FastAPI upload, image selected in draft -> save/reopen
- [ ] QA in browser: Cancel picker does not change ad URL; Escape and backdrop close only media picker, not the parent draft editor; focus returns to parent editor
- [ ] QA in browser: selection and upload work equally for cover artwork
- [ ] QA: invalid asset URL remains in picker with error; authenticated media 401/403 or failed upload shows request id and does not claim success
- [ ] QA: keyboard, small screens and two independent pickers in one edit form
- [ ] QA: unchanged Mobile endpoints/releases, public website publication and Firestore state

## Deployment & rollback
Frontend only; no FastAPI, Firebase, Storage, security-rule, Mobile or public Website changes. Needs manual review/merge and frontend deployment (CI does not deploy WebAdmin). Revert this UI PR if necessary; no data migration.
