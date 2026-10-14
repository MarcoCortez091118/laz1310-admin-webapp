# LA Z Android/iOS control plane — SaaS editorial UX (Issue #76)

## Why this branch

Website galleries/wizards were merged in #75, but native Android/iOS Banners,
Pages, Programs, Dynamics and media still used horizontally stacked rows and
cropped artwork. This Admin-only PR addresses **native App**, not Website.

## Architecture (SOLID / security-by-design)

- `src/features/app-ui/NativeArtworkPreview.tsx`: pure presentation of
  bounded image/alt/fallback. No IO other than browser image GET, no direct
  Storage access, no publication logic.
- `NativeEditorSteps.tsx`: generic accessible progress UI, no data writes.
- `native-editorial.css`: scoped responsive editorial layout; native
  five-card grid and container-query Programs/Dynamics catalog, 1-5 columns.
- App Banners: artwork-safe cards with order/edit/remove, a three-step
  Information -> Artwork -> Review modal. Applying changes updates the local
  App Draft editor only. Original Save Draft and Publish separate.
- App Programs: catalog expanded to full container, bounded thumbnails and
  10 cards/page; guided information, schedule and preview, existing Save Draft
  and immutable release publication remain separate.
- App Dynamics: 10 cards/page, bounded poster catalog; guided metadata,
  calendar, participation/consent and review. Original `validateDynamicForm`
  runs on Save with `noValidate` so hidden input fields do not block native
  form submission and safety guards remain authoritative. Participant tools,
  ETag, admin-only lifecycle controls unchanged.
- App Pages: card blocks rendered as previews in a 1-5-column gallery; edit
  modal uses local working state so Cancel discards changes and Apply updates
  only the Page Draft. ManagedImageField continues through the native App
  media picker.
- App Media: only `/api/v1/admin/media`; one **real** native App folder,
  scoped upload in a collapsible section and existing searchable media grid.
  Separate Website media never cross-populates native App.
- App Notifications: message/destination, audience, review + private draft
  workflow; queue send retains existing separate irreversible confirmation
  and admin checks. Delivery count cards use theme tokens.
- App Users: loaded user directory shows 10 rows/page, existing server cursor
  load-more and exact email lookup unaffected; count cards only show actual
  loaded data, not fabricated total users.
- No external animation/shadcn dependency introduced into current MUI React
  stack. Shared UI tokens are handled by AppProviders and semantic palette.

## Verification

- [ ] CI TypeScript, ESLint, Vitest, Vite production build
- [ ] Native gallery 320/360/768/1280/1920+ viewport, dark/light, 1-5
  columns according to **available** width (not naive monitor width)
- [ ] Tall/square/wide/corrupt images and long titles do not overflow
- [ ] Native Banner modal steps, Media picker, Save Draft, publish separately
- [ ] Programs schedule overnight/overlap validation and ETag conflict reload
- [ ] Dynamics participation, consent and field validation at review/save;
  admin-only publish and user participation no regressions
- [ ] Notifications private draft versus queue confirm; test non-admin user
- [ ] Pages card apply/cancel, content version, preview and release separation
- [ ] Users cursor pagination, exact email, protected data; mobile horizontal
  overflow check; no direct GCS writes
- [ ] Manual browser/staging QA screenshots before approval/merge

## Rollback

Revert this Admin-only PR; no schema/storage/rule changes. Keep PR as Draft
until QA sign-off. Do not merge/deploy automatically.
