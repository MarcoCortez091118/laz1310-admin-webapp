import { CalendarRange, Plus, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { Dynamic } from "../../api/types";
import { useStaff } from "../auth/StaffGate";
import { useDraftQuery } from "../content/queries";
import { DynamicEditor } from "./DynamicEditor";
import { dynamicWindowState } from "./model";
import { ParticipationPanel } from "./ParticipationPanel";
import "./dynamics.css";

function displayWindow(dynamic: Dynamic): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: dynamic.timezone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${formatter.format(new Date(dynamic.startsAt))} → ${formatter.format(new Date(dynamic.endsAt))}`;
  } catch {
    return `${dynamic.startsAt} → ${dynamic.endsAt}`;
  }
}

export function DynamicsPage() {
  const draft = useDraftQuery();
  const staff = useStaff();
  const admin = staff.roles.includes("admin");
  const [selection, setSelection] = useState<string | "new" | null>(null);
  const [participationTarget, setParticipationTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "upcoming" | "closed">("all");

  const dynamics = draft.data?.data.catalog?.dynamics ?? [];
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return dynamics
      .filter((dynamic) => {
        const state = dynamicWindowState(dynamic);
        const statusMatch = status === "all" || (status === "closed" ? state === "closed" || state === "ended" : state === status);
        const searchMatch = !normalized || dynamic.title.toLowerCase().includes(normalized) || dynamic.slug.toLowerCase().includes(normalized) || (dynamic.context ?? "").toLowerCase().includes(normalized);
        return statusMatch && searchMatch;
      })
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  }, [dynamics, search, status]);

  const selected = selection && selection !== "new" ? dynamics.find((item) => item.id === selection) ?? null : null;
  const participationDynamic = participationTarget ? dynamics.find((item) => item.id === participationTarget) ?? null : null;

  if (draft.isPending) {
    return <section className="page-stack"><div className="panel">Loading dynamics catalog…</div></section>;
  }

  if (draft.error || !draft.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Dynamics</p>
          <h1>Unable to load the Draft.</h1>
          <p className="muted">{draft.error instanceof Error ? draft.error.message : "Admin API unavailable."}</p>
          <button onClick={() => void draft.refetch()} type="button">Retry</button>
        </article>
      </section>
    );
  }

  const etag = draft.data.etag;
  if (!etag) {
    return (
      <section className="page-stack">
        <article className="panel">
          <h1>Draft ETag missing</h1>
          <p className="muted">Writes are disabled because optimistic concurrency cannot be enforced safely.</p>
        </article>
      </section>
    );
  }

  const openCount = dynamics.filter((item) => dynamicWindowState(item) === "open").length;
  const upcomingCount = dynamics.filter((item) => dynamicWindowState(item) === "upcoming").length;
  const featuredCount = dynamics.filter((item) => item.featured ?? false).length;

  return (
    <section className="page-stack dynamics-page">
      <header className="page-heading split-heading dynamics-heading">
        <div>
          <p className="eyebrow">Content / Draft #{draft.data.data.revision ?? "—"}</p>
          <h1>Dynamics</h1>
          <p className="muted">Create contests and promotions, configure participation, and publish them to Mobile through immutable releases.</p>
        </div>
        <button onClick={() => { setParticipationTarget(null); setSelection("new"); }} type="button"><Plus size={16} /> New dynamic</button>
      </header>

      <div className="dynamic-metrics">
        <article className="metric-card"><span><Sparkles size={16} /> Open now</span><strong>{openCount}</strong></article>
        <article className="metric-card"><span><CalendarRange size={16} /> Upcoming</span><strong>{upcomingCount}</strong></article>
        <article className="metric-card"><span>Featured</span><strong>{featuredCount}</strong></article>
        <article className="metric-card wide"><span>Draft campaigns</span><strong>{dynamics.length}</strong><small>Public visibility still depends on Publish.</small></article>
      </div>

      <div className="dynamic-toolbar panel">
        <label className="dynamic-search"><Search aria-hidden size={17} /><input aria-label="Search dynamics" onChange={(event) => setSearch(event.target.value)} placeholder="Search title, slug, or context" value={search} /></label>
        <div className="dynamic-filter" aria-label="Dynamic status filter">
          {(["all", "open", "upcoming", "closed"] as const).map((value) => (
            <button className={status === value ? "selected" : ""} key={value} onClick={() => setStatus(value)} type="button">{value[0].toUpperCase() + value.slice(1)}</button>
          ))}
        </div>
      </div>

      <div className="dynamics-content-layout">
        <aside className="dynamic-card-grid" aria-label="Dynamics list">
          {filtered.length ? filtered.map((dynamic) => {
            const state = dynamicWindowState(dynamic);
            return (
              <article className={`dynamic-card ${selection === dynamic.id ? "selected" : ""}`} key={dynamic.id}>
                <button className="dynamic-card-main" onClick={() => { setParticipationTarget(null); setSelection(dynamic.id ?? null); }} type="button">
                  <div className="dynamic-card-art">
                    <img alt="" referrerPolicy="no-referrer" src={dynamic.imageUrl} />
                    <span className={`dynamic-state ${state}`}>{state === "ended" ? "Ended" : state[0].toUpperCase() + state.slice(1)}</span>
                    {dynamic.featured ? <span className="dynamic-featured">Featured</span> : null}
                  </div>
                  <div className="dynamic-card-copy">
                    <span>{dynamic.context ?? "LA Z 1310"}</span>
                    <strong>{dynamic.title}</strong>
                    <small>{displayWindow(dynamic)}</small>
                    <small>{dynamic.participation.type === "form" ? `${dynamic.participation.fields?.length ?? 0} form fields` : "External participation"}</small>
                  </div>
                </button>
                {admin ? (
                  <button className="dynamic-participations-button" onClick={() => { setSelection(dynamic.id ?? null); setParticipationTarget(dynamic.id ?? null); }} type="button"><UsersRound size={15} /> Participations</button>
                ) : (
                  <span className="dynamic-admin-note"><ShieldCheck size={14} /> PII is admin-only</span>
                )}
              </article>
            );
          }) : (
            <article className="panel dynamic-list-empty"><strong>No dynamics found.</strong><span>Adjust the filters or create a new campaign.</span></article>
          )}
        </aside>

        <div className="dynamic-detail-column">
          {admin && participationDynamic ? (
            <ParticipationPanel dynamic={participationDynamic} onClose={() => setParticipationTarget(null)} />
          ) : selection === "new" || selected ? (
            <DynamicEditor
              dynamic={selection === "new" ? null : selected}
              etag={etag}
              key={`${selection ?? "none"}-${draft.data.data.revision ?? 0}`}
              onDeleted={() => { setSelection(null); setParticipationTarget(null); }}
              onReload={async () => draft.refetch()}
              onSaved={(dynamicId) => setSelection(dynamicId)}
            />
          ) : (
            <article className="panel empty-editor dynamic-empty-editor">
              <p className="eyebrow">Dynamics</p>
              <h2>Select a campaign to edit.</h2>
              <p className="muted">Editors manage campaign definitions in Draft. Administrators can additionally inspect protected participation records.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
