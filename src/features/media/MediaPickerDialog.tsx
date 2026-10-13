import { FolderOpen, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MediaAsset } from "../../api/types";
import { MediaAssetGrid } from "./MediaAssetGrid";
import { MediaUploadPanel } from "./MediaUploadPanel";
import { useMediaLibraryQuery } from "./queries";
import "./media.css";

export function MediaPickerDialog({
  open,
  currentUrl,
  title = "Choose managed image",
  description = "Select an existing managed image or upload a new one.",
  onClose,
  onSelect,
}: {
  open: boolean;
  currentUrl?: string | null;
  title?: string;
  description?: string;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const library = useMediaLibraryQuery();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"existing" | "upload">("existing");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setActiveTab("existing");
      setSearch("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const assets = useMemo(
    () => library.data?.pages.flatMap((page) => page.data) ?? [],
    [library.data],
  );
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return assets;
    return assets.filter((asset) => asset.alt.toLowerCase().includes(value));
  }, [assets, search]);

  function select(asset: MediaAsset) {
    onSelect(asset);
    onClose();
  }

  return (
    <dialog
      aria-labelledby="media-picker-title"
      className="media-picker-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      ref={dialogRef}
    >
      <div className="media-picker-shell">
        <header className="media-picker-header">
          <div>
            <p className="eyebrow">Media Library</p>
            <h2 id="media-picker-title">{title}</h2>
            <p className="muted">{description}</p>
          </div>
          <button aria-label="Close media picker" className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="media-picker-tabs" role="tablist" aria-label="Image source">
          <button role="tab" type="button" aria-selected={activeTab === "existing"}
            className={activeTab === "existing" ? "active" : ""}
            onClick={() => setActiveTab("existing")}>
            <FolderOpen size={17} /> Choose existing
          </button>
          <button role="tab" type="button" aria-selected={activeTab === "upload"}
            className={activeTab === "upload" ? "active" : ""}
            onClick={() => setActiveTab("upload")}>
            <Upload size={17} /> Upload image
          </button>
        </div>
        <div className="media-picker-body media-picker-tab-body">
          {activeTab === "upload" ? (
            <div role="tabpanel" aria-label="Upload image">
              <MediaUploadPanel compact onUploaded={select} />
            </div>
          ) : (
            <section className="media-picker-library" role="tabpanel" aria-label="Choose existing image">
              <label className="media-search">
                <Search aria-hidden size={17} />
                <input
                  aria-label="Search media library"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search image descriptions"
                  value={search}
                />
              </label>
              {library.isPending ? (
                <div className="media-empty-state"><span>Loading media library…</span></div>
              ) : library.error ? (
                <div className="error-banner">
                  <div>
                    <strong>Unable to load images.</strong>
                    <span>{library.error instanceof Error ? library.error.message : "Admin API unavailable."}</span>
                  </div>
                  <button onClick={() => void library.refetch()} type="button">Retry</button>
                </div>
              ) : (
                <>
                  <MediaAssetGrid assets={filtered}
                    emptyMessage={search.trim() ? "No images match this search." : "No managed images yet."}
                    onSelect={select} selectedUrl={currentUrl} />
                  {library.hasNextPage ? (
                    <div className="media-load-more">
                      <button className="secondary-button" disabled={library.isFetchingNextPage}
                        onClick={() => void library.fetchNextPage()} type="button">
                        {library.isFetchingNextPage ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}
