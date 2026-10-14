# LA Z Admin — Editorial galleries and guided editors

## Requirement / identity

Adapt the supplied modern portfolio, statistics, gallery-folder and stepped-form
references into **LA Z 1310**, not mock freelancer earnings or a cloned demo.
Visual contract: five cards on wide displays, responsive down to one on phones,
bounded previews regardless of image dimensions, approachable controls, clear
status, and separation of Website vs native App assets.

## SOLID architecture

- `src/features/media/editorial-gallery.css`: responsive five-column grid and
  appearance-aware media styling; no inline ad-hoc per-screen image sizing.
- `WebsiteMediaBrowser.tsx`: shared UI that receives one closed
  `WebsiteMediaFolder` discriminant. It resolves exactly one existing
  FastAPI endpoint: banner-media, show-media or ticket-promotion-media.
  It does not read from native App media and never receives a bucket URL.
- `WebsiteArtworkField.tsx`: shared picker/uploader presentation. Each
  upload reuses the existing dedicated Website API method and invalidates
  only its associated React Query cache key.
- `WebsiteMediaLibraryPage.tsx`: folder overview with scoped search and
  paginated loaded results, accessible through Website navigation/dashboard.
- Existing `ShowPosterField`, `PromotionArtworkField` and
  `WebsiteBannerMediaControls`: small purpose-specific wrappers.
- `EditorialFormSteps.tsx` + `editorialValidation.ts`: separate step layout
  and pure validators from API actions. Banners, Shows and Ticket Promotions
  each have Information → Artwork → Review with next/back and validation.
- Shared `ArtworkPreview` with `object-fit:contain`, bounded aspect ratio,
  lazy loading and fallback for missing/broken images.

## Backend contracts and limitations

| Collection | Endpoint | Browser access |
|---|---|---|
| App media | `/api/v1/admin/media` | App's existing Media Library only |
| Website banners | `/api/v1/admin/website/banner-media` | Website Banners picker/library |
| Website Shows | `/api/v1/admin/website/show-media` | Website Shows picker/library |
| Ticket Promotions | `/api/v1/admin/website/ticket-promotion-media` | Website Ticket Promotions picker/library |

Current Website endpoints supply limited inventories (generally up to 100).
Search is over **loaded entries only**, never mislabeled as an exhaustive
recursive GCS scan. True indexed search/cursor pagination/subfolders require
FastAPI Issue #91. The displayed folders represent **verified application
namespaces**, not fabricated nested object trees.

## Security and editorial behavior

Firebase Auth + App Check stay in `apiRequest`; FastAPI validates permissions,
MIME/bytes, asset ownership and optimistic `If-Match` revisions.
No WebAdmin direct Firestore, Storage, FCM or public Website writes.
Uploads select a URL; edits update local working content; Save draft writes to
FastAPI; Publish/Unpublish/Trash/Restore remain **separate** authorized actions.
Existing registration and n8n integration are not touched.

## Verification and acceptance

1. TypeScript, ESLint, Vitest (folder isolation, URL and form validators,
   router scope), Vite production bundle.
2. Visually inspect 320, 360, 768, 1280, 1640 and 1920px in light/dark.
   Confirm 1/2/3/4/5 cards without horizontal overflow or image bleed.
3. Use wide desktop, narrow portrait and invalid artwork; verify alt/fallback,
   keyboard navigation, focus, modal escape/return.
4. Edit an imported show, change artwork using Shows folder, Save draft,
   verify still unpublished; publish only via admin contextual menu.
5. Repeat for banner desktop/mobile and Ticket Promotions form/link actions.
   Ensure a selected Website image never appears in Mobile media calls.
6. Unpublish/trash/restore/rollback and admin vs editor role regressions in
   authenticated staging before approving the Draft PR.
7. No automatic merge/deploy. Rollback is reverting this admin-only PR;
   no migrations or published content changes.

Changes on the draft branch alone are **not proof** of browser or staging
acceptance. Those checks must be evidenced separately before merge.
