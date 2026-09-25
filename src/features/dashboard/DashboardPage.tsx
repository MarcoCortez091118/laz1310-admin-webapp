const cards = [
  ["Draft", "Connect /api/v1/admin/draft", "ETag / If-Match protected"],
  ["Published", "Connect /api/v1/admin/public-state", "Immutable release pointer"],
  ["System", "Connect /health + /ready", "Operational status"],
  ["Dynamics", "Connect /api/v1/admin/dynamics", "Editorial campaigns"],
];

export function DashboardPage() {
  return (
    <section className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Control plane</p>
          <h1>Overview</h1>
          <p className="muted">
            The Admin WebApp consumes FastAPI only. No direct Firestore or FCM writes.
          </p>
        </div>
      </header>

      <div className="metric-grid">
        {cards.map(([title, value, description]) => (
          <article className="metric-card" key={title}>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>{description}</small>
          </article>
        ))}
      </div>

      <article className="panel">
        <div>
          <p className="eyebrow">Editorial workflow</p>
          <h2>Draft → Preview → Publish → Immutable Release</h2>
        </div>
        <p className="muted">
          Business screens will be wired only after their live OpenAPI contracts are generated.
          A 409 conflict will require explicit reload and reconciliation.
        </p>
      </article>
    </section>
  );
}
