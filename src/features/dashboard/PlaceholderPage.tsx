export function PlaceholderPage({
  title,
  dependency,
}: {
  title: string;
  dependency: string;
}) {
  return (
    <section className="page-stack">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Module foundation</p>
          <h1>{title}</h1>
          <p className="muted">{dependency}</p>
        </div>
      </header>
      <article className="panel">
        <strong>No fixtures will be fabricated here.</strong>
        <p className="muted">
          This screen will be implemented against the corresponding FastAPI/OpenAPI contract.
        </p>
      </article>
    </section>
  );
}
