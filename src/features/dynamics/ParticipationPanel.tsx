import { useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect } from "react";
import { ApiError } from "../../api/errors";
import type { AdminParticipation, Dynamic } from "../../api/types";
import { dynamicsQueryKeys, useParticipationsQuery } from "./queries";

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ParticipationCard({ item }: { item: AdminParticipation }) {
  const values = item.values ?? {};
  return (
    <article className="participation-card">
      <header>
        <div>
          <strong>{displayDate(item.submittedAt)}</strong>
          <span>{item.authenticated ? "Authenticated user" : "Anonymous participant"}</span>
        </div>
        <code>{item.id.slice(0, 8)}</code>
      </header>
      <dl>
        {Object.entries(values).map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <footer>
        <span><ShieldCheck size={14} /> Consent v{item.consent.version}</span>
        <span>Accepted {displayDate(item.consent.acceptedAt)}</span>
      </footer>
    </article>
  );
}

export function ParticipationPanel({ dynamic, onClose }: { dynamic: Dynamic; onClose: () => void }) {
  const queryClient = useQueryClient();
  const dynamicId = dynamic.id ?? null;
  const query = useParticipationsQuery(dynamicId, Boolean(dynamicId));
  const items = query.data?.pages.flatMap((page) => page.data.items) ?? [];

  useEffect(() => {
    return () => {
      if (dynamicId) queryClient.removeQueries({ queryKey: dynamicsQueryKeys.participations(dynamicId) });
    };
  }, [dynamicId, queryClient]);

  const apiError = query.error instanceof ApiError ? query.error : null;

  return (
    <section className="panel participation-panel" aria-label={`Participations for ${dynamic.title}`}>
      <header className="participation-panel-heading">
        <div>
          <p className="eyebrow">Protected data</p>
          <h2>{dynamic.title}</h2>
          <p className="muted">Participation values are decrypted by FastAPI for authorized administrators only.</p>
        </div>
        <button aria-label="Close participations" className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
      </header>

      <div className="participation-security-note">
        <LockKeyhole size={17} />
        <span>PII is kept in memory only for this view. Closing this panel clears its TanStack Query cache; no export or browser persistence is provided.</span>
      </div>

      {query.isPending ? (
        <div className="dynamic-empty-state">Loading protected participations…</div>
      ) : query.error ? (
        <div className="error-banner">
          <div>
            <strong>Unable to read participations.</strong>
            <span>{query.error instanceof Error ? query.error.message : "Admin API unavailable."}</span>
            {apiError?.kind === "rate-limited" ? <span>PII reads are rate limited by FastAPI.</span> : null}
            {apiError?.requestId ? <code>Request ID: {apiError.requestId}</code> : null}
          </div>
          <button onClick={() => void query.refetch()} type="button"><RefreshCw size={16} /> Retry</button>
        </div>
      ) : items.length ? (
        <>
          <div className="participation-grid">
            {items.map((item) => <ParticipationCard item={item} key={item.id} />)}
          </div>
          {query.hasNextPage ? (
            <div className="participation-load-more">
              <button className="secondary-button" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} type="button">
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : <p className="media-end-copy">All loaded participations are shown.</p>}
        </>
      ) : (
        <div className="dynamic-empty-state">No participations have been recorded for this dynamic.</div>
      )}
    </section>
  );
}
