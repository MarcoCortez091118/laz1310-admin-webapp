import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { ApiError } from "../../api/errors";
import type { Page } from "../../api/types";
import { adminQueryKeys, deletePage, putPage } from "../content/api";
import { useDraftQuery } from "../content/queries";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function PageEditor({
  page,
  etag,
  onSaved,
  onDeleted,
  onReload,
}: {
  page: Page | null;
  etag: string;
  onSaved: (slug: string) => void;
  onDeleted: () => void;
  onReload: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [title, setTitle] = useState(page?.title ?? "");
  const existing = page !== null;

  const save = useMutation({
    mutationFn: async () => {
      const normalizedSlug = slug.trim().toLowerCase();
      const normalizedTitle = title.trim();
      if (!SLUG.test(normalizedSlug)) {
        throw new Error("Slug must use lowercase letters, numbers and single hyphens.");
      }
      if (!normalizedTitle) {
        throw new Error("Title is required.");
      }

      const payload: Page = page
        ? { ...page, title: normalizedTitle }
        : { slug: normalizedSlug, title: normalizedTitle, blocks: [] };

      return putPage(payload, etag);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(adminQueryKeys.draft, result);
      onSaved(result.data.catalog.pages.find((item) => item.title === title.trim())?.slug ?? slug.trim());
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
          <h2>{existing ? page.title : "Create an empty page"}</h2>
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
            <span>Reload the current Draft before saving again. Nothing was overwritten.</span>
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
            onChange={(event) => setSlug(event.target.value)}
            placeholder="news"
            value={slug}
          />
          <small>{existing ? "Existing slugs are immutable in this editor." : "Example: community-news"}</small>
        </label>

        <label>
          Title
          <input
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Community News"
            value={title}
          />
        </label>
      </div>

      <section className="blocks-summary">
        <div>
          <strong>Blocks</strong>
          <span className="muted">
            {page?.blocks.length ?? 0} configured. This slice preserves blocks but does not edit them yet.
          </span>
        </div>
        {page?.blocks.length ? (
          <ol>
            {page.blocks.map((block, index) => (
              <li key={block.id ?? `${block.type}-${index}`}>
                <span>{index + 1}</span>
                <strong>{block.type}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">No blocks configured.</p>
        )}
      </section>

      <div className="editor-actions">
        <span className="muted">Write is protected by the current Draft ETag.</span>
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
  const [selection, setSelection] = useState<string | "new" | null>(null);

  const pages = draft.data?.data.catalog.pages ?? [];
  const selected = useMemo(
    () => pages.find((page) => page.slug === selection) ?? null,
    [pages, selection],
  );

  if (draft.isPending) {
    return <section className="page-stack"><div className="panel">Loading Draft pages…</div></section>;
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

  return (
    <section className="page-stack">
      <header className="page-heading split-heading">
        <div>
          <p className="eyebrow">Content / Draft #{draft.data.data.revision}</p>
          <h1>Pages</h1>
          <p className="muted">Manage page metadata without publishing automatically.</p>
        </div>
        <button onClick={() => setSelection("new")} type="button">
          <Plus size={16} />
          New page
        </button>
      </header>

      <div className="content-layout">
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
                  <small>/{page.slug}</small>
                </button>
              ))
          ) : (
            <p className="empty-copy">The Draft has no pages.</p>
          )}
        </aside>

        {selection === "new" || selected ? (
          <PageEditor
            etag={etag}
            key={selection}
            onDeleted={() => setSelection(null)}
            onReload={async () => draft.refetch()}
            onSaved={(slug) => setSelection(slug)}
            page={selection === "new" ? null : selected}
          />
        ) : (
          <article className="panel empty-editor">
            <p className="eyebrow">Pages</p>
            <h2>Select a page or create a new one.</h2>
            <p className="muted">
              Saving changes updates only the Draft. Mobile and Web remain on the current immutable release.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
