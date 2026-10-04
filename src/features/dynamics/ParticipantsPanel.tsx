import { Download, ShieldCheck, UserRound } from "lucide-react";
import { useMemo } from "react";
import type { AdminParticipation } from "../../api/types";
import { useDynamicParticipationsQuery } from "./queries";

interface ParticipantsPanelProps {
  dynamicId: string;
  title: string;
  isAdmin: boolean;
  active: boolean;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function loadedCsv(items: AdminParticipation[]): string {
  const keys = Array.from(new Set(items.flatMap((item) => Object.keys(item.values ?? {}))));
  const header = ["id", "dynamicId", "submittedAt", "releaseId", "acceptedReleaseId", "authenticated", "consentVersion", ...keys];
  const rows = items.map((item) => [
    item.id,
    item.dynamicId,
    item.submittedAt,
    item.releaseId,
    item.acceptedReleaseId,
    item.authenticated,
    item.consent?.version,
    ...keys.map((key) => item.values?.[key] ?? ""),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function ParticipantsPanel({ dynamicId, title, isAdmin, active }: ParticipantsPanelProps) {
  const query = useDynamicParticipationsQuery(dynamicId, active && isAdmin);
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data.items ?? []) ?? [],
    [query.data],
  );

  if (!isAdmin) {
    return (
      <article className="panel dynamic-participants-gate">
        <ShieldCheck size={28} />
        <h3>Administrator access required</h3>
        <p className="muted">Participant responses contain PII. The API exposes this route only to verified users with the admin role.</p>
      </article>
    );
  }

  if (query.isPending) {
    return <article className="panel">Loading audited participant records…</article>;
  }

  if (query.error) {
    return (
      <article className="panel dynamic-participants-gate">
        <h3>Unable to load participants</h3>
        <p className="muted">{query.error instanceof Error ? query.error.message : "Admin API unavailable."}</p>
        <button onClick={() => void query.refetch()} type="button">Retry</button>
      </article>
    );
  }

  return (
    <section className="dynamic-participants">
      <div className="panel dynamic-participants-summary">
        <div>
          <p className="eyebrow">Audited PII access</p>
          <h3>{title}</h3>
          <p className="muted">{items.length} participant record{items.length === 1 ? "" : "s"} loaded. The backend audits each paginated read.</p>
        </div>
        <button
          disabled={!items.length}
          onClick={() => {
            const blob = new Blob([loadedCsv(items)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `dynamics-${dynamicId}-participants-loaded.csv`;
            anchor.click();
            URL.revokeObjectURL(url);
          }}
          type="button"
        >
          <Download size={16} /> Export loaded rows
        </button>
      </div>

      {items.length ? (
        <div className="dynamic-participant-list">
          {items.map((item) => (
            <article className="panel dynamic-participant-card" key={item.id}>
              <header>
                <div>
                  <strong><UserRound size={15} /> {item.id}</strong>
                  <span>{formatDate(item.submittedAt)}</span>
                </div>
                <span className={`dynamic-auth-chip ${item.authenticated ? "authenticated" : "anonymous"}`}>
                  {item.authenticated ? "Authenticated" : "Anonymous"}
                </span>
              </header>

              <dl className="dynamic-response-values">
                {Object.entries(item.values ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <footer>
                <span>Presented release <code>{item.releaseId}</code></span>
                <span>Accepted release <code>{item.acceptedReleaseId}</code></span>
                <span>Consent v{item.consent?.version ?? "—"} · accepted {formatDate(item.consent?.acceptedAt)}</span>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <article className="panel dynamic-participants-empty">
          <h3>No participations yet</h3>
          <p className="muted">This campaign has no retained participant records.</p>
        </article>
      )}

      {query.hasNextPage ? (
        <button
          className="dynamic-load-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
          type="button"
        >
          {query.isFetchingNextPage ? "Loading…" : "Load next page"}
        </button>
      ) : null}
    </section>
  );
}
