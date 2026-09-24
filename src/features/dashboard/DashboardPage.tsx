import { useStaff } from "../auth/StaffGate";
import { useDraftQuery, usePublicStateQuery } from "../content/queries";

function shortId(value: string | null | undefined): string {
  if (!value) {
    return "Unpublished";
  }
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

export function DashboardPage() {
  const staff = useStaff();
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();

  const catalog = draft.data?.data.catalog;
  const loading = draft.isPending || publicState.isPending;
  const failed = draft.error ?? publicState.error;

  return (
    <section className="page-stack">
      <header className="page-heading split-heading">
        <div>
          <p className="eyebrow">Control plane</p>
          <h1>Overview</h1>
          <p className="muted">
            Signed in as {staff.uid}. Roles: {staff.roles.join(", ")}.
          </p>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          FastAPI source of truth
        </div>
      </header>

      {failed ? (
        <article className="panel error-banner">
          <strong>Unable to load administrative state.</strong>
          <span>{failed instanceof Error ? failed.message : "Unknown API error"}</span>
          <button
            onClick={() => {
              void draft.refetch();
              void publicState.refetch();
            }}
            type="button"
          >
            Retry
          </button>
        </article>
      ) : null}

      <div className="metric-grid">
        <article className="metric-card">
          <span>Draft revision</span>
          <strong>{loading ? "…" : draft.data?.data.revision ?? "—"}</strong>
          <small>
            {draft.data?.etag ? `ETag ${draft.data.etag}` : "Optimistic concurrency"}
          </small>
        </article>
        <article className="metric-card">
          <span>Published release</span>
          <strong>{loading ? "…" : shortId(publicState.data?.data.releaseId)}</strong>
          <small>
            Published state revision {publicState.data?.data.revision ?? "—"}
          </small>
        </article>
        <article className="metric-card">
          <span>Pages</span>
          <strong>{loading ? "…" : catalog?.pages?.length ?? 0}</strong>
          <small>Draft catalog</small>
        </article>
        <article className="metric-card">
          <span>Stations</span>
          <strong>{loading ? "…" : catalog?.stations?.length ?? 0}</strong>
          <small>Draft radio configuration</small>
        </article>
        <article className="metric-card">
          <span>Dynamics</span>
          <strong>{loading ? "…" : catalog?.dynamics?.length ?? 0}</strong>
          <small>Draft campaigns</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <p className="eyebrow">Editorial workflow</p>
          <h2>Draft → Preview → Publish → Immutable Release</h2>
          <p className="muted">
            Page edits in this Admin update only the Draft. Public clients remain pinned to
            the current release until an administrator publishes.
          </p>
        </article>

        <article className="panel">
          <p className="eyebrow">Current Draft</p>
          <dl className="detail-list">
            <div>
              <dt>Revision</dt>
              <dd>{draft.data?.data.revision ?? "—"}</dd>
            </div>
            <div>
              <dt>Updated by</dt>
              <dd>{draft.data?.data.updatedBy ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Updated at</dt>
              <dd>{draft.data?.data.updatedAt ?? "Not recorded"}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  );
}
