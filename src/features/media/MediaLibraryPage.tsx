import { ChevronDown, FolderOpen, Image as ImageIcon, Search, ShieldCheck } from "lucide-react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { useMemo, useState } from "react";
import { ApiError } from "../../api/errors";
import type { MediaAsset } from "../../api/types";
import { MediaAssetGrid } from "./MediaAssetGrid";
import { MediaUploadPanel } from "./MediaUploadPanel";
import { useMediaLibraryQuery } from "./queries";
import "./media.css";
import "./editorial-gallery.css";

export function MediaLibraryPage() {
  const library = useMediaLibraryQuery();
  const [search, setSearch] = useState("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const assets = useMemo(
    () => library.data?.pages.flatMap((page) => page.data) ?? [],
    [library.data],
  );
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return assets;
    return assets.filter(
      (asset) =>
        asset.alt.toLowerCase().includes(value) ||
        String(asset.id).toLowerCase().includes(value),
    );
  }, [assets, search]);

  async function copy(asset: MediaAsset) {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopyStatus(`Copied URL for “${asset.alt}”.`);
    } catch {
      setCopyStatus("Clipboard access is unavailable in this browser context.");
    }
  }

  const error = library.error;
  const apiError = error instanceof ApiError ? error : null;

  return (
    <section className="page-stack media-page">
      <header className="page-heading split-heading media-heading">
        <div>
          <p className="eyebrow">Content assets</p>
          <h1>Media Library</h1>
          <p className="muted">
            Browse and select managed Android/iOS artwork in a responsive gallery. Website Banners, Shows and Promotions have separate libraries.
          </p>
        </div>
        <div className="media-policy-badge">
          <ShieldCheck size={17} />
          <span>
            <strong>Sanitized pipeline</strong>
            <small>WebP · EXIF removed · immutable asset ID</small>
          </span>
        </div>
      </header>

      <div className="media-folder-grid">
        <div className="media-folder-tile" aria-label="Native app media collection">
          <FolderOpen size={26} aria-hidden color="#D30A12"/>
          <span style={{ minWidth: 0 }}>
            <strong>Android / iOS artwork</strong>
            <small>{assets.length} loaded images · native App Media API only</small>
          </span>
        </div>
      </div>
      <Accordion disableGutters sx={{ border: "1px solid", borderColor: "divider",
        borderRadius: "14px !important", overflow: "hidden" }}>
        <AccordionSummary expandIcon={<ChevronDown size={18}/>}
          aria-controls="native-media-upload" id="native-media-upload-title">
          <strong>Upload image to Android/iOS</strong>
        </AccordionSummary>
        <AccordionDetails id="native-media-upload">
          <MediaUploadPanel/>
        </AccordionDetails>
      </Accordion>

      <section className="panel media-library-panel">
        <div className="media-library-heading">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Available images</h2>
            <p className="muted">Search the assets currently loaded from the administrative API.</p>
          </div>
          <label className="media-search">
            <Search aria-hidden size={17} />
            <input
              aria-label="Search media"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search description or asset ID"
              value={search}
            />
          </label>
        </div>

        {copyStatus ? <p className="media-status-message" role="status">{copyStatus}</p> : null}

        {library.isPending ? (
          <div className="media-empty-state"><span>Loading media library…</span></div>
        ) : error ? (
          <div className="error-banner">
            <div>
              <strong>Unable to load media.</strong>
              <span>{error instanceof Error ? error.message : "Admin API unavailable."}</span>
              {apiError?.requestId ? <code>Request ID: {apiError.requestId}</code> : null}
            </div>
            <button onClick={() => void library.refetch()} type="button">Retry</button>
          </div>
        ) : (
          <>
            <MediaAssetGrid
              assets={filtered}
              emptyMessage={search.trim() ? "No images match this search." : "No images uploaded yet."}
              onCopy={(asset) => void copy(asset)}
            />
            {library.hasNextPage ? (
              <div className="media-load-more">
                <button
                  className="secondary-button"
                  disabled={library.isFetchingNextPage}
                  onClick={() => void library.fetchNextPage()}
                  type="button"
                >
                  {library.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : assets.length ? (
              <p className="media-end-copy">All loaded assets are shown.</p>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}
