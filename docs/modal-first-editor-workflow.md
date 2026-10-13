# LA Z Admin — Modal-first editorial UX

**Owner:** NeuroMarket · TechquilaTeam  
**Issue:** #36  
**Base:** `main` at `1943a7107b569f18df30426f39bd8365a5dd3823`

## User problem
Long create/edit forms appeared inline with resource catalogs. Users had to scroll to locate the edit
surface and then search again for the media upload/selection action. The Media Library displayed a
permanent upload form above the asset grid.

## UX contract
- **Pages, Programs and Dynamics:** New/Edit opens a centered, responsive dialog. List and
  selected item remain on the page; the form scrolls *within the dialog*.
- **Banners:** New/Edit stages one banner in a dialog; choosing a managed image is part of that
  interaction. `Add to Draft`/`Apply changes` updates local form state only; `Save draft` persists
  the Banners page; `Publish banners` remains a separate admin-only operation.
- **Media Library:** one primary Upload image action opens the existing FastAPI-backed uploader
  in a dialog. The image selector offers *Choose existing* and *Upload new* tabs rather than two
  lengthy side-by-side panels.
- **Discard protection:** closing an edited ResourceEditorDialog asks before losing local
  changes. Dialog labels, keyboard closing, focus management and the media picker are maintained
  by Material UI and the native media dialog.
- **No mock data:** Only real assets from `GET /api/v1/admin/media`; image upload still uses
  `PUT /api/v1/admin/media/{uuid}` with FastAPI's image validation.

## Architecture / SOLID
`src/components/ResourceEditorDialog.tsx` owns only presentation/accessibility and the
unsaved-change closure policy. Domain editors own validation, edits, mutations, and ETag.
`onDirtyChange` is an optional, additive callback; existing editor consumers retain behavior.
No SDK, Firebase, App Check, Firestore, or backend API contract is modified. Material UI remains
the project's design system (the supplied shadcn example is visual reference, not a dependency).

## Verification
1. `npm install`, `npm run typecheck`, `npm run lint`, `npm run test`,
   `npm run build` (OpenAPI generation needs the configured API URL).
2. Test new/edit on desktop and narrow viewport for Pages, Programs and Dynamics.
3. Open ManagedImageField from inside each editor, switch between library and upload,
   select an actual managed image, verify it returns to the original form.
4. Check unsaved discard prompt: Keep editing retains fields; Discard closes without mutation.
5. Confirm modal save updates Draft but NOT Mobile until explicit Publish; verify selective publish
   and notification/security behavior are unchanged.
6. Two-editor collision must still yield `409` and prompt reload/reconciliation, not overwrite.
7. For Banners, verify local Apply, reorder, Save Draft and admin-only Publish independently.
8. Media Library upload must close on successful API response and refresh the asset grid.

## Risks and rollback
- Large Page/Programs/Dynamics forms now scroll inside dialogs; check nested native media picker,
  focus restoration, long forms and mobile keyboard in physical/browser QA.
- Closing an editor during an in-flight backend mutation may not cancel that request; operation
  completion remains authoritative and UI will reconcile with query invalidation.
- Rollback: revert this PR; no schema, migration, or server behavior changes.
- Manual reviewer approval and merge only; do not merge before CI + UX device acceptance.
