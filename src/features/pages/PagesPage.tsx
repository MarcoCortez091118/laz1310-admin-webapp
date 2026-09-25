import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApiError } from "../../api/errors";
import type { Page, Station } from "../../api/types";
import { adminQueryKeys, deletePage, putPage } from "../content/api";
import { useDraftQuery, usePreviewQuery } from "../content/queries";
import { PageBuilder } from "./PageBuilder";
import { PagePreview } from "./PagePreview";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type PreviewMode = "live" | "server";

function PageEditor({
  page,
  pages,
  stations,
  etag,
  serverPage,
  serverRevision,
  serverPreviewPending,
  serverPreviewError,
  onRefreshServerPreview,
  onSaved,
  onDeleted,
  onReload,
}: {
  page: Page | null;
  pages: Page[];
  stations: Station[];
  etag: string;
  serverPage: Page | null;
  serverRevision: number | undefined;
  serverPreviewPending: boolean;
  serverPreviewError: Error | null;
  onRefreshServerPreview: () => Promise<unknown>;
  onSaved: (slug: string) => void;
  onDeleted: () => void;
  onReload: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const existing = page !== null;
  const [workingPage, setWorkingPage] = useState<Page>(
    page ?? { slug: "", title: "", blocks: [] },
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("live");

  const save = useMutation({
    mutationFn: async () => {
      const normalizedSlug = workingPage.slug.trim().toLowerCase();
      const normalizedTitle = workingPage.title.trim();

      if (!SLUG.test(normalizedSlug)) {
        throw new Error("Slug must use lowercase letters, numbers and single hyphens.");
      }
      if (!normalizedTitle) {
        throw new Error("Title is required.");
      }
      if ((workingPage.blocks ?? []).length > 30) {
        throw new Error("A page may contain at most 30 blocks.");
      }

      const payload: Page = {
        ...workingPage,
        slug: normalizedSlug,
        title: normalizedTitle,
        blocks: workingPage.blocks ?? [],
      };

      return putPage(payload, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      onSaved(workingPage.slug.trim().toLowerCase());
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!page) {
        return null;
      }
      return deletePage(page.slug, etag);
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.setQueryData(adminQueryKeys.draft, result);
      }
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.preview });
      onDeleted();
    },
  });

  const error = save.error ?? remove.error;
  const conflict = error instanceof ApiError && error.kind === "conflict";

  return (
    <article className="panel page-editor">
      <div className="editor-heading">
        <div>
          <p className="eyebrow">{existing ? "Edit page" : "New page"}</p>
          <h2>{workingPage.title || "Untitled page"}</h2>
        </div>
        {existing ? (
          <button
            className="danger-button"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(`Delete page "${page.title}" from the Draft?`)) {
                remove.mutate();
              }
            }}
            type="button"
          >
            <Trash2 size={16} />
            Delete
          </button>
        ) : null}
      </div>

      {conflict ? (
        <div className="conflict-banner">
          <div>
            <strong>Draft changed while you were editing.</strong>
            <span>
              Reload the current Draft before saving again. Nothing was overwritten.
            </span>
          </div>
          <button
            onClick={() => {
              void onReload();
              save.reset();
              remove.reset();
            }}
            type="button"
          >
            <RefreshCw size={16} />
            Reload Draft
          </button>
        </div>
      ) : error ? (
        <div className="error-banner">
          <strong>Unable to update this page.</strong>
          <span>{error instanceof Error ? error.message : "Unknown error"}</span>
          {error instanceof ApiError && error.requestId ? (
            <code>Request ID: {error.requestId}</code>
          ) : null}
        </div>
      ) : null}

      <div className="editor-grid">
        <label>
          Slug
          <input
            disabled={existing}
            maxLength={100}
            onChange={(event) =>
              setWorkingPage((current) => ({
                ...current,
                slug: event.target.value,
              }))
            }
            placeholder="news"
            value={workingPage.slug}
          />
          <small>
            {existing
              ? "Existing slugs are immutable in this editor."
              : "Example: community-news"}
          </small>
        </label>

        <label>
          Title
          <input
            maxLength={160}
            onChange={(event) =>
              setWorkingPage((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            placeholder="Community News"
            value={workingPage.title}
          />
        </label>
      </div>

      <div className="page-workbench">
        <PageBuilder
          onChange={setWorkingPage}
          page={workingPage}
          pages={pages}
          stations={stations}
        />

        <div className="preview-column">
          <div className="preview-mode-bar">
            <div>
              <button
                className={previewMode === "live" ? "selected" : ""}
                onClick={() => setPreviewMode("live")}
                type="button"
              >
                Live Preview
              </button>
              <button
                className={previewMode === "server" ? "selected" : ""}
                onClick={() => setPreviewMode("server")}
                type="button"
              >
                Server Draft
              </button>
            </div>
            {previewMode === "server" ? (
              <button
                className="icon-button"
                disabled={serverPreviewPending}
                onClick={() => void onRefreshServerPreview()}
                title="Refresh server preview"
                type="button"
              >
                <RefreshCw size={15} />
              </button>
            ) : null}
          </div>

          {previewMode === "live" ? (
            <PagePreview
              description="Unsaved local composition. Saving is still required."
              page={workingPage}
              stations={stations}
              title="Live Preview"
            />
          ) : serverPreviewPending ? (
            <article className="panel preview-state">Loading persisted Draft preview…</article>
          ) : serverPreviewError ? (
            <article className="panel preview-state error-banner">
              <strong>Server preview unavailable.</strong>
              <span>{serverPreviewError.message}</span>
            </article>
          ) : serverPage ? (
            <PagePreview
              description={`Persisted in server Draft revision ${serverRevision ?? "—"}.`}
              page={serverPage}
              stations={stations}
              title="Server Draft Preview"
            />
          ) : (
            <article className="panel preview-state">
              <strong>This page is not persisted in the Draft yet.</strong>
              <span className="muted">Save it first, then refresh Server Draft.</span>
            </article>
          )}
        </div>
      </div>

      <div className="editor-actions">
        <span className="muted">
          Saving replaces this Page in the Draft only and is protected by {etag}.
        </span>
        <button
          disabled={save.isPending || remove.isPending}
          onClick={() => save.mutate()}
          type="button"
        >
          {save.isPending ? "Saving…" : existing ? "Save page" : "Create page"}
        </button>
      </div>
    </article>
  );
}

export function PagesPage() {
  const draft = useDraftQuery();
  const preview = usePreviewQuery();
  const [selection, setSelection] = useState<string | "new" | null>(null);

  const pages = draft.data?.data.catalog?.pages ?? [];
  const stations = draft.data?.data.catalog?.stations ?? [];
  const previewPages = preview.data?.data.catalog?.pages ?? [];

  const selected = useMemo(
    () => pages.find((page) => page.slug === selection) ?? null,
    [pages, selection],
  );
  const serverSelected = useMemo(
    () => previewPages.find((page) => page.slug === selection) ?? null,
    [previewPages, selection],
  );

  if (draft.isPending) {
    return (
      <section className="page-stack">
        <div className="panel">Loading Draft pages…</div>
      </section>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <section className="page-stack">
        <article className="panel">
          <p className="eyebrow">Pages</p>
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

  return (
    <section className="page-stack">
      <header className="page-heading split-heading">
        <div>
          <p className="eyebrow">Content / Draft #{draft.data.data.revision ?? "—"}</p>
          <h1>Pages</h1>
          <p className="muted">
            Compose page blocks visually, preview locally, then persist to the Draft.
          </p>
        </div>
        <button onClick={() => setSelection("new")} type="button">
          <Plus size={16} />
          New page
        </button>
      </header>

      <div className="content-layout page-content-layout">
        <aside className="panel resource-list">
          <div className="resource-list-heading">
            <strong>{pages.length} pages</strong>
            <code>{etag}</code>
          </div>
          {pages.length ? (
            pages
              .slice()
              .sort((left, right) => left.title.localeCompare(right.title))
              .map((page) => (
                <button
                  className={selection === page.slug ? "selected" : ""}
                  key={page.slug}
                  onClick={() => setSelection(page.slug)}
                  type="button"
                >
                  <span>{page.title}</span>
                  <small>
                    /{page.slug} · {(page.blocks ?? []).length} blocks
                  </small>
                </button>
              ))
          ) : (
            <p className="empty-copy">The Draft has no pages.</p>
          )}
        </aside>

        {selection === "new" || selected ? (
          <PageEditor
            etag={etag}
            key={`${selection ?? "none"}-${draft.data.data.revision ?? 0}`}
            onDeleted={() => setSelection(null)}
            onRefreshServerPreview={async () => preview.refetch()}
            onReload={async () => draft.refetch()}
            onSaved={(savedSlug) => setSelection(savedSlug)}
            page={selection === "new" ? null : selected}
            pages={pages}
            serverPage={selection === "new" ? null : serverSelected}
            serverPreviewError={
              preview.error instanceof Error ? preview.error : null
            }
            serverPreviewPending={preview.isPending || preview.isFetching}
            serverRevision={preview.data?.data.revision}
            stations={stations}
          />
        ) : (
          <article className="panel empty-editor">
            <p className="eyebrow">Pages</p>
            <h2>Select a page or create a new one.</h2>
            <p className="muted">
              Changes remain local until Save. Saving updates only the Draft; Mobile and
              Web remain on the current immutable release.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
