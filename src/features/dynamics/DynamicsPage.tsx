import { Clock3, Plus, Search, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useStaff } from "../auth/StaffGate";
import { DynamicEditor } from "./DynamicEditor";
import { lifecycle, type DynamicLifecycle } from "./model";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { useDynamicsQuery } from "./queries";
import "./dynamics.css";

type Selection = string | "new" | null;
type DetailTab = "editor" | "participants";
type LifecycleFilter = "all" | DynamicLifecycle;

const FILTERS: LifecycleFilter[] = ["all", "live", "scheduled", "closed", "ended"];

function dateSummary(startsAt: string | undefined, endsAt: string | undefined, timezone: string | undefined) {
  if (!startsAt || !endsAt) return "Window unavailable";
  const format = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone || "America/Detroit",
    timeZoneName: "short",
  });
  return `${format.format(new Date(startsAt))} → ${format.format(new Date(endsAt))}`;
}

export function DynamicsPage() {
  const staff = useStaff();
  const query = useDynamicsQuery();
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<DetailTab>("editor");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LifecycleFilter>("all");
  const isAdmin = staff.roles?.includes("admin") ?? false;

  const dynamics = useMemo(() => query.data?.data ?? [], [query.data]);
  const now = new Date();

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...dynamics]
      .filter((dynamic) => {
        const current = lifecycle(dynamic, now);
        const matchLifecycle = filter === "all" || current === filter;
        const matchSearch =
          !needle ||
          (dynamic.title ?? "").toLowerCase().includes(needle) ||
          (dynamic.slug ?? "").toLowerCase().includes(needle) ||
          (dynamic.context ?? "").toLowerCase().includes(needle);
        return matchLifecycle && matchSearch;
      })
      .sort((left, right) => {
        if ((left.featured ?? false) !== (right.featured ?? false)) return left.featured ? -1 : 1;
        return new Date(left.startsAt ?? 0).getTime() - new Date(right.startsAt ?? 0).getTime();
      });
  }, [dynamics, filter, now, search]);

  const selected = useMemo(
    () =>
      selection && selection !== "new"
        ? dynamics.find((dynamic) => dynamic.id === selection) ?? null
        : null,
    [dynamics, selection],
  );

  if (query.isPending) {
    return <section className="page-stack"><div className="panel">Loading Dynamics Draft…</div></section>;
  }

  if (query.error || !query.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Dynamics</p>
          <h1>Unable to load campaigns.</h1>
          <p className="muted">{query.error instanceof Error ? query.error.message : "Admin API unavailable."}</p>
          <button onClick={() => void query.refetch()} type="button">Retry</button>
        </article>
      </section>
    );
  }

  const etag = query.data.etag;
  if (!etag) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Dynamics</p>
          <h1>Draft ETag missing</h1>
          <p className="muted">Campaign writes are disabled because optimistic concurrency cannot be enforced safely.</p>
        </article>
      </section>
    );
  }

  const liveCount = dynamics.filter((item) => lifecycle(item, now) === "live").length;
  const scheduledCount = dynamics.filter((item) => lifecycle(item, now) === "scheduled").length;
  const formCount = dynamics.filter((item) => item.participation?.type === "form").length;

  return (
    <section className="page-stack dynamics-page">
      <header className="page-heading split-heading dynamics-heading">
        <div>
          <p className="eyebrow">Content / Draft ETag {etag}</p>
          <h1>Dynamics</h1>
          <p className="muted">Manage contests and promotions in the Draft. Mobile changes only after the global Publish workflow creates an immutable release.</p>
        </div>
        <button
          disabled={dynamics.length >= 100}
          onClick={() => {
            setSelection("new");
            setTab("editor");
          }}
          type="button"
        >
          <Plus size={16} /> New campaign
        </button>
      </header>

      <div className="dynamic-metrics">
        <article className="dynamic-metric-card"><span><Sparkles size={16} /> Campaigns</span><strong>{dynamics.length}</strong><small>Max 100 in catalog</small></article>
        <article className="dynamic-metric-card"><span><Clock3 size={16} /> Live now</span><strong>{liveCount}</strong><small>{scheduledCount} scheduled</small></article>
        <article className="dynamic-metric-card"><span><UsersRound size={16} /> Native forms</span><strong>{formCount}</strong><small>{dynamics.length - formCount} external</small></article>
      </div>

      <div className="panel dynamic-toolbar">
        <label className="dynamic-search">
          <Search aria-hidden size={17} />
          <input aria-label="Search campaigns" onChange={(event) => setSearch(event.target.value)} placeholder="Search title, slug, or context" value={search} />
        </label>
        <div className="dynamic-filter" aria-label="Campaign lifecycle filter">
          {FILTERS.map((value) => (
            <button className={filter === value ? "selected" : ""} key={value} onClick={() => setFilter(value)} type="button">
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="dynamic-layout">
        <aside className="dynamic-list" aria-label="Dynamics campaigns">
          {filtered.length ? (
            filtered.map((dynamic) => {
              const current = lifecycle(dynamic, now);
              return (
                <button
                  className={`dynamic-card ${selection === dynamic.id ? "selected" : ""}`}
                  key={dynamic.id}
                  onClick={() => {
                    setSelection(dynamic.id ?? null);
                    setTab("editor");
                  }}
                  type="button"
                >
                  <div className="dynamic-card-art">
                    <img alt="" referrerPolicy="no-referrer" src={dynamic.imageUrl} />
                    <span className={`dynamic-lifecycle ${current}`}>{current}</span>
                    {dynamic.featured ? <span className="dynamic-featured">Featured</span> : null}
                  </div>
                  <div className="dynamic-card-copy">
                    <strong>{dynamic.title}</strong>
                    <span>{dynamic.context} · {dynamic.participation?.type === "form" ? "Native form" : "External URL"}</span>
                    <small>{dateSummary(dynamic.startsAt, dynamic.endsAt, dynamic.timezone)}</small>
                    <code>{dynamic.slug}</code>
                  </div>
                </button>
              );
            })
          ) : (
            <article className="panel dynamic-list-empty">
              <strong>No campaigns found.</strong>
              <span>Adjust the filters or create a new Dynamic.</span>
            </article>
          )}
        </aside>

        <div className="dynamic-detail">
          {selection === "new" ? (
            <DynamicEditor
              allDynamics={dynamics}
              dynamic={null}
              etag={etag}
              key={`new-${etag}`}
              onDeleted={() => setSelection(null)}
              onSaved={(dynamicId) => setSelection(dynamicId)}
            />
          ) : selected ? (
            <>
              <div className="dynamic-detail-tabs" role="tablist">
                <button aria-selected={tab === "editor"} className={tab === "editor" ? "selected" : ""} onClick={() => setTab("editor")} role="tab" type="button">Campaign</button>
                <button aria-selected={tab === "participants"} className={tab === "participants" ? "selected" : ""} onClick={() => setTab("participants")} role="tab" type="button">Participants {isAdmin ? "" : "(admin)"}</button>
              </div>
              {tab === "editor" ? (
                <DynamicEditor
                  allDynamics={dynamics}
                  dynamic={selected}
                  etag={etag}
                  key={`${selected.id}-${etag}`}
                  onDeleted={() => setSelection(null)}
                  onSaved={(dynamicId) => setSelection(dynamicId)}
                />
              ) : (
                <ParticipantsPanel active={tab === "participants"} dynamicId={selected.id ?? ""} isAdmin={isAdmin} title={selected.title ?? "Campaign"} />
              )}
            </>
          ) : (
            <article className="panel empty-editor dynamic-empty-editor">
              <p className="eyebrow">Dynamics</p>
              <h2>Select the existing test campaign or create a new one.</h2>
              <p className="muted">The existing campaign is loaded directly from <code>GET /api/v1/admin/dynamics</code>; no local fixtures or mock campaigns are used.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
