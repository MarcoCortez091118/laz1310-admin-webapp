# LA Z Admin visual system V1 — Dark-first editorial operations

## Design direction and scope

Adapt the supplied 2026-10-13 AdminCN references into the **existing** LA Z admin,
not into a copied AdminCN template. Use LA Z's near-black / burgundy / red brand
identity, compact left navigation, rounded operational cards, responsive dashboard
charts and denser structured tables, forms and dialogs. Both Website and App
Android/iOS remain independent editorial workspaces as introduced in #67.

## Design architecture

- `src/app/theme.ts`: semantic Material UI tokens for shared surfaces, typography,
  card, input, table, menu, dialog and button components. Dark-first; light available.
- `src/app/appearance.ts`: testable bounded preference reader with safe storage
  fallback; appearance is **not** tied to Firebase user identity, backend records or RBAC.
- `src/app/AppProviders.tsx`: the single ThemeProvider and query-client boundary.
- `src/admin-visual-system.css`: tightly scoped legacy CSS compatibility for
  older `.panel`, `.page-stack`, card and editor classes; no direct auth/data effects.
- `src/app/AdminShell.tsx`: workspace selector, responsive sidebar, accessible
  theme toggle, high-density topbar and native app-specific release chips.
- `src/features/dashboard/DashboardPage.tsx`: retains genuine native Mobile
  catalog Draft/Release metrics; updates chart contrast and semantic colors.
- `src/features/website/WebsiteDashboardPage.tsx`: reads real Website editorial
  draft pages and banner publication via FastAPI and renders responsive cards and
  a chart. Counts are explicitly **loaded page** only (News <=50, Shows/Promotions
  <=100). Missing data shows "—" and errors, never invented totals or traffic.
  No published-app revision is shown as a Website revision.

## Safety and SDLC

No change to API contracts, request headers, App Check, Firebase Authentication,
roles, Mobile, Firestore, publish/rollback, n8n or Website public feeds.

- The material UI component palette owns modal/input/card/table focus and contrast.
- CSS compatibility layer handles existing non-MUI editor widgets and page layout.
- Responsive 320px+, keyboard focus, screen-reader labels and reduced-motion styles.
- Theme selection is per-browser, reversible and fails safe without local storage.
- Tests validate appearance mode, blocked preference storage and theme tokens.
- CI TypeScript, ESLint, Vitest and Vite build; human screenshot review on 360px,
  768px, 1280px and 1920px for both modes plus existing editorial dialogs.
- Manual merge only; rollback by reverting this Admin-only PR.

## Subsequent scoped UX issues

Iterate per-feature after acceptance: News pagination/filter/table editor, Show
and Ticket Promotions list views, native app Programs/Dynamics editors, and
specialized forms/confirmation dialogs. Preserve functionality and trace each
separate improvement in its own Issue/PR and tested branch. No mock sales,
payments, orders, engagement or advertising numbers without real API contracts.
