import { CalendarDays, Plus, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Station } from "../../api/types";
import { useDraftQuery } from "../content/queries";
import { ProgramEditor } from "./ProgramEditor";
import {
  displayTime,
  programsForStation,
  type Program,
  schedulesForProgram,
  WEEKDAYS,
} from "./model";
import "./programs.css";

function scheduleSummary(station: Station, program: Program): string {
  const entries = schedulesForProgram(station, program.id);
  if (!entries.length) return "No schedule";
  return (
    entries
      .slice(0, 3)
      .map(
        (entry) =>
          `${WEEKDAYS[entry.weekday].slice(0, 3)} ${displayTime(entry.startsAt)}–${displayTime(entry.endsAt)}`,
      )
      .join(" · ") + (entries.length > 3 ? ` +${entries.length - 3}` : "")
  );
}

export function ProgramsPage() {
  const draft = useDraftQuery();
  const stations = draft.data?.data.catalog?.stations ?? [];
  const [stationId, setStationId] = useState<string>("");
  const [selection, setSelection] = useState<string | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  useEffect(() => {
    const firstStationId = stations[0]?.id;
    if (!stationId && firstStationId) setStationId(firstStationId);
  }, [stationId, stations]);

  const station = useMemo(
    () => stations.find((item) => item.id === stationId) ?? stations[0] ?? null,
    [stationId, stations],
  );

  const programs = useMemo(() => {
    if (!station) return [];
    const normalized = search.trim().toLowerCase();
    return programsForStation(station)
      .filter((program) => {
        const active = program.isActive ?? true;
        const matchStatus =
          status === "all" || (status === "active" ? active : !active);
        const matchSearch =
          !normalized ||
          program.name.toLowerCase().includes(normalized) ||
          (program.hostName ?? "").toLowerCase().includes(normalized) ||
          program.slug.toLowerCase().includes(normalized);
        return matchStatus && matchSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [search, station, status]);

  const selected = useMemo(
    () =>
      station && selection && selection !== "new"
        ? programsForStation(station).find((program) => program.id === selection) ?? null
        : null,
    [selection, station],
  );

  if (draft.isPending) {
    return (
      <section className="page-stack">
        <div className="panel">Loading program catalog…</div>
      </section>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Programs</p>
          <h1>Unable to load the Draft.</h1>
          <p className="muted">
            {draft.error instanceof Error ? draft.error.message : "Admin API unavailable."}
          </p>
          <button onClick={() => void draft.refetch()} type="button">
            Retry
          </button>
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
          <p className="muted">
            Writes are disabled because optimistic concurrency cannot be enforced safely.
          </p>
        </article>
      </section>
    );
  }

  if (!stations.length || !station) {
    return (
      <section className="page-stack">
        <article className="panel empty-editor">
          <p className="eyebrow">Programs</p>
          <h2>Create a station before adding programs.</h2>
          <p className="muted">
            Programs belong to a radio station and cannot exist without one.
          </p>
        </article>
      </section>
    );
  }

  const activeCount = programsForStation(station).filter(
    (program) => program.isActive ?? true,
  ).length;
  const scheduledCount = new Set((station.schedule ?? []).map((entry) => entry.showId)).size;

  return (
    <section className="page-stack programs-page">
      <header className="page-heading split-heading programs-heading">
        <div>
          <p className="eyebrow">Content / Draft #{draft.data.data.revision ?? "—"}</p>
          <h1>Programs</h1>
          <p className="muted">
            Create shows, assign artwork, and manage weekly broadcast schedules delivered to Mobile.
          </p>
        </div>
        <button onClick={() => setSelection("new")} type="button">
          <Plus size={16} />
          New program
        </button>
      </header>

      <div className="program-metrics">
        <article className="program-metric-card">
          <span>
            <UsersRound size={16} /> Active programs
          </span>
          <strong>{activeCount}</strong>
        </article>
        <article className="program-metric-card">
          <span>
            <CalendarDays size={16} /> Scheduled programs
          </span>
          <strong>{scheduledCount}</strong>
        </article>
        <article className="program-metric-card wide">
          <span>Station</span>
          <select
            aria-label="Station"
            onChange={(event) => {
              setStationId(event.target.value);
              setSelection(null);
            }}
            value={station.id ?? ""}
          >
            {stations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </article>
      </div>

      <div className="program-toolbar panel">
        <label className="program-search">
          <Search aria-hidden size={17} />
          <input
            aria-label="Search programs"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by program, host, or slug"
            value={search}
          />
        </label>
        <div className="program-filter" aria-label="Program status filter">
          {(["all", "active", "inactive"] as const).map((value) => (
            <button
              className={status === value ? "selected" : ""}
              key={value}
              onClick={() => setStatus(value)}
              type="button"
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="content-layout programs-content-layout">
        <aside className="program-card-grid" aria-label="Programs list">
          {programs.length ? (
            programs.map((program) => {
              const active = program.isActive ?? true;
              return (
                <button
                  className={`program-card ${selection === program.id ? "selected" : ""}`}
                  key={program.id}
                  onClick={() => setSelection(program.id)}
                  type="button"
                >
                  <div className="program-card-art">
                    {program.imageUrl ? (
                      <img alt="" src={program.imageUrl} />
                    ) : (
                      <div className="program-card-placeholder">LA Z</div>
                    )}
                    <span className={active ? "program-state active" : "program-state"}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="program-card-copy">
                    <strong>{program.name}</strong>
                    <span>{program.hostName || "No host assigned"}</span>
                    <small>{scheduleSummary(station, program)}</small>
                  </div>
                </button>
              );
            })
          ) : (
            <article className="panel program-list-empty">
              <strong>No programs found.</strong>
              <span>Adjust the filters or create a new program.</span>
            </article>
          )}
        </aside>

        {selection === "new" || selected ? (
          <ProgramEditor
            etag={etag}
            key={`${station.id ?? "station"}-${selection ?? "none"}-${draft.data.data.revision ?? 0}`}
            onDeleted={() => setSelection(null)}
            onReload={async () => draft.refetch()}
            onSaved={(programId) => setSelection(programId)}
            program={selection === "new" ? null : selected}
            station={station}
          />
        ) : (
          <article className="panel empty-editor program-empty-editor">
            <p className="eyebrow">Programs</p>
            <h2>Select a program to edit.</h2>
            <p className="muted">
              Changes are written only to the Draft. Mobile stays on the current immutable release until Publish.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
