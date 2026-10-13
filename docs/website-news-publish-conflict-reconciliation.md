# Website News — First Publish HTTP 409 reconciliation UX

**Issue #58**, depends on FastAPI Issue #76 / independent API Draft PR.

Production screenshot: advertisement 1:1 preview renders and GET preview returns 200; GET publication/history return 404 (expected no releases). First POST publish returns 409 Conflict.

The previous UI collapsed every 409 into an unhelpful generic message, and attempted to refetch release history even if no public Website release existed. The new UI:

- Displays the backend's exact safe `409 detail` and distinguishes first-publish 404.
- For imported legacy article drafts, loads a verified source comparison API; no blind publishing if baseline is missing or legacy article changed.
- Shows side-by-side **current public article** and **saved draft** for headline, summary, full text, cover, advertising, category and source.
- Requires a conscious admin checkbox and confirmation to acknowledge the reviewed source. Backend uses both ETag If-Match on draft and a hash of current legacy article for transactional CAS.
- Saves a new audited draft revision without changing existing article fields, publishing or editing public `posts`. User must review the updated draft and click **Publish** separately.
- Skips needless refresh of release history for first-publish articles.
- Native Mobile and existing public Website behavior remain unchanged.

## QA

- [ ] CI lint/types/Vitest/build.
- [ ] Editor sees status, cannot reconcile or publish.
- [ ] Admin sees full comparison and must check confirm.
- [ ] Old migrated draft without fingerprint: review → reconcile revision N+1 → separate publish.
- [ ] Stale review hash, revoked token, no legacy source, malformed payload and 409 original detail.
- [ ] Audit record present; Mobile state and legacy `posts` untouched.
- [ ] Test staging Firebase project isolation before live writes; merge/deploy only after manual review.

Rollback: revert Admin PR; previous UI remains. FastAPI endpoint is additive; no data migration or automatic production actions.
