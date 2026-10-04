import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  History,
  RefreshCw,
  RotateCcw,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import { useStaff } from "../auth/StaffGate";
import { adminQueryKeys } from "../content/api";
import { useDraftQuery, usePublicStateQuery } from "../content/queries";
import { publishDraft, rollbackRelease } from "./api";
import {
  formatReleaseDate,
  publicationStatus,
  type ReleaseHistoryItem,
} from "./model";
import { releaseQueryKeys, useReleasesQuery } from "./queries";
import "./releases.css";

const MAX_NOTE = 300;

function mutationMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

export function ReleasesPage() {
  const staff = useStaff();
  const queryClient = useQueryClient();
  const draft = useDraftQuery();
  const publicState = usePublicStateQuery();
  const releasesQuery = useReleasesQuery();
  const [publishNote, setPublishNote] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<ReleaseHistoryItem | null>(null);
  const [rollbackNote, setRollbackNote] = useState("");
  const admin = staff.roles.includes("admin");

  const releases = useMemo(
    () => releasesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [releasesQuery.data],
  );
  const status = publicationStatus(draft.data?.data, publicState.data?.data, releases);

  const publish = useMutation({
    mutationFn: async () => {
      const etag = draft.data?.etag;
      if (!etag) throw new Error("Draft ETag is missing. Reload before publishing.");
      const note = publishNote.trim();
      if (!note) throw new Error("A release note is required.");
      return publishDraft(note, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.publicState, result);
      void queryClient.invalidateQueries({ queryKey: releaseQueryKeys.all });
      setPublishNote("");
    },
  });

  const rollback = useMutation({
    mutationFn: async () => {
      const etag = publicState.data?.etag;
      if (!etag) throw new Error("Published-state ETag is missing. Reload before rollback.");
      if (!rollbackTarget) throw new Error("Choose a release to restore.");
      const note = rollbackNote.trim();
      if (!note) throw new Error("A rollback note is required.");
      return rollbackRelease(rollbackTarget.id, note, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.publicState, result);
      setRollbackTarget(null);
      setRollbackNote("");
    },
  });

  if (!admin) {
    return (
      <section className="page-stack">
        <article className="panel release-access-card">
          <ShieldCheck size={26} />
          <div>
            <p className="eyebrow">Administrator permission required</p>
            <h1>Publishing is restricted.</h1>
            <p className="muted">
              Editors can prepare Draft content, but only administrators may publish or rollback releases.
            </p>
          </div>
        </article>
      </section>
    );
  }

  const loading = draft.isPending || publicState.isPending || releasesQuery.isPending;
  if (loading) {
    return <section className="page-stack"><div className="panel">Loading release control plane…</div></section>;
  }

  const loadError = draft.error ?? publicState.error ?? releasesQuery.error;
  if (loadError || !draft.data || !publicState.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Releases</p>
          <h1>Unable to load publishing state.</h1>
          <p className="muted">{mutationMessage(loadError)}</p>
          <button
            onClick={() => {
              void draft.refetch();
              void publicState.refetch();
              void releasesQuery.refetch();
            }}
            type="button"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </article>
      </section>
    );
  }

  const activeId = publicState.data.data.releaseId ?? null;
  const publishError = publish.error;
  const rollbackError = rollback.error;

  return (
    <section className="page-stack releases-page">
      <header className="page-heading split-heading releases-heading">
        <div>
          <p className="eyebrow">Editorial delivery</p>
          <h1>Publish & Releases</h1>
          <p className="muted">
            Promote a validated Draft to an immutable Mobile release, or restore a previous release without rewriting history.
          </p>
        </div>
        <div className="release-security-pill">
          <ShieldCheck size={17} />
          <span><strong>Admin only</strong><small>ETag-protected state changes</small></span>
        </div>
      </header>

      <div className="release-metrics">
        <article className="metric-card">
          <span>Draft revision</span>
          <strong>#{draft.data.data.revision}</strong>
          <small>{draft.data.etag ?? "ETag unavailable"}</small>
        </article>
        <article className="metric-card">
          <span>Published state revision</span>
          <strong>#{publicState.data.data.revision}</strong>
          <small>{publicState.data.etag ?? "ETag unavailable"}</small>
        </article>
        <article className="metric-card wide">
          <span>Editorial status</span>
          <strong>
            {status === "current" ? "Draft matches active release" :
              status === "changes" ? "Unpublished Draft changes" :
              status === "unpublished" ? "No release published" : "State pending history sync"}
          </strong>
        </article>
      </div>

      <div className="release-workbench">
        <section className="panel publish-panel">
          <div className="release-section-heading">
            <div className="release-icon"><Rocket size={19} /></div>
            <div>
              <p className="eyebrow">Publish</p>
              <h2>Create immutable release</h2>
              <p className="muted">
                FastAPI validates the full catalog before changing the public release pointer.
              </p>
            </div>
          </div>

          <label className="release-note-field">
            Release note
            <textarea
              maxLength={MAX_NOTE}
              onChange={(event) => {
                setPublishNote(event.target.value);
                publish.reset();
              }}
              placeholder="Describe the content included in this release."
              rows={4}
              value={publishNote}
            />
            <small>{publishNote.length}/{MAX_NOTE} characters · required</small>
          </label>

          {publishError ? (
            <div className={publishError instanceof ApiError && publishError.kind === "conflict" ? "conflict-banner" : "error-banner"}>
              <div>
                <strong>{publishError instanceof ApiError && publishError.kind === "conflict" ? "Draft changed before publish." : "Publish failed."}</strong>
                <span>{mutationMessage(publishError)}</span>
                {publishError instanceof ApiError && publishError.requestId ? <code>Request ID: {publishError.requestId}</code> : null}
              </div>
              {publishError instanceof ApiError && publishError.kind === "conflict" ? (
                <button onClick={() => void draft.refetch()} type="button"><RefreshCw size={15} /> Reload Draft</button>
              ) : null}
            </div>
          ) : null}

          <div className="release-actions">
            <span className="muted">Publishing does not mutate the Draft; it snapshots it into a new immutable release.</span>
            <button
              disabled={!publishNote.trim() || !draft.data.etag || publish.isPending}
              onClick={() => publish.mutate()}
              type="button"
            >
              <Rocket size={16} /> {publish.isPending ? "Publishing…" : "Publish Draft"}
            </button>
          </div>
        </section>

        <aside className="panel active-release-card">
          <div className="release-section-heading compact">
            <div className="release-icon"><CheckCircle2 size={19} /></div>
            <div><p className="eyebrow">Live now</p><h2>Active release</h2></div>
          </div>
          {activeId ? (
            <>
              <code className="release-id">{activeId}</code>
              <dl className="detail-list">
                <div><dt>Public state</dt><dd>#{publicState.data.data.revision}</dd></div>
                <div><dt>Updated</dt><dd>{publicState.data.data.updatedAt ? formatReleaseDate(publicState.data.data.updatedAt) : "—"}</dd></div>
              </dl>
            </>
          ) : <p className="muted">Nothing has been published yet.</p>}
        </aside>
      </div>

      <section className="panel release-history-panel">
        <div className="release-history-heading">
          <div>
            <p className="eyebrow">Immutable history</p>
            <h2>Release history</h2>
            <p className="muted">Rollback only changes the active pointer. Historical release records remain immutable.</p>
          </div>
          <History size={22} />
        </div>

        {releases.length ? (
          <div className="release-list">
            {releases.map((release) => {
              const active = release.id === activeId;
              return (
                <article className={`release-row ${active ? "active" : ""}`} key={release.id}>
                  <div className="release-row-marker"><Clock3 size={16} /></div>
                  <div className="release-row-main">
                    <div className="release-row-title">
                      <strong>Draft #{release.sourceRevision}</strong>
                      {active ? <span className="active-release-badge">LIVE</span> : null}
                    </div>
                    <p>{release.note}</p>
                    <div className="release-meta">
                      <span>{formatReleaseDate(release.publishedAt)}</span>
                      <span>{release.publishedBy}</span>
                      <code>{release.id.slice(0, 8)}</code>
                    </div>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={active || !publicState.data.etag || rollback.isPending}
                    onClick={() => {
                      rollback.reset();
                      setRollbackTarget(release);
                      setRollbackNote("");
                    }}
                    type="button"
                  >
                    <RotateCcw size={15} /> Restore
                  </button>
                </article>
              );
            })}
          </div>
        ) : <div className="release-empty">No immutable releases exist yet.</div>}

        {releasesQuery.hasNextPage ? (
          <div className="release-load-more">
            <button
              className="secondary-button"
              disabled={releasesQuery.isFetchingNextPage}
              onClick={() => void releasesQuery.fetchNextPage()}
              type="button"
            >
              {releasesQuery.isFetchingNextPage ? "Loading…" : "Load more releases"}
            </button>
          </div>
        ) : null}
      </section>

      {rollbackTarget ? (
        <div className="release-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target && !rollback.isPending) setRollbackTarget(null);
        }}>
          <section aria-labelledby="rollback-title" aria-modal="true" className="release-modal" role="dialog">
            <div className="release-section-heading">
              <div className="release-icon warning"><RotateCcw size={19} /></div>
              <div>
                <p className="eyebrow">Rollback</p>
                <h2 id="rollback-title">Restore Draft #{rollbackTarget.sourceRevision}</h2>
                <p className="muted">This changes what Mobile receives. The current and target release records are not deleted.</p>
              </div>
            </div>
            <div className="rollback-target-summary">
              <strong>{rollbackTarget.note}</strong>
              <code>{rollbackTarget.id}</code>
            </div>
            <label className="release-note-field">
              Rollback reason
              <textarea
                autoFocus
                maxLength={MAX_NOTE}
                onChange={(event) => {
                  setRollbackNote(event.target.value);
                  rollback.reset();
                }}
                placeholder="Explain why the previous release is being restored."
                rows={3}
                value={rollbackNote}
              />
              <small>{rollbackNote.length}/{MAX_NOTE} characters · required</small>
            </label>
            {rollbackError ? (
              <div className={rollbackError instanceof ApiError && rollbackError.kind === "conflict" ? "conflict-banner" : "error-banner"}>
                <div>
                  <strong>{rollbackError instanceof ApiError && rollbackError.kind === "conflict" ? "Published state changed." : "Rollback failed."}</strong>
                  <span>{mutationMessage(rollbackError)}</span>
                  {rollbackError instanceof ApiError && rollbackError.requestId ? <code>Request ID: {rollbackError.requestId}</code> : null}
                </div>
                {rollbackError instanceof ApiError && rollbackError.kind === "conflict" ? (
                  <button onClick={() => void publicState.refetch()} type="button"><RefreshCw size={15} /> Reload state</button>
                ) : null}
              </div>
            ) : null}
            <div className="release-modal-actions">
              <button className="secondary-button" disabled={rollback.isPending} onClick={() => setRollbackTarget(null)} type="button">Cancel</button>
              <button disabled={!rollbackNote.trim() || rollback.isPending || !publicState.data.etag} onClick={() => rollback.mutate()} type="button">
                <RotateCcw size={16} /> {rollback.isPending ? "Restoring…" : "Confirm rollback"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
