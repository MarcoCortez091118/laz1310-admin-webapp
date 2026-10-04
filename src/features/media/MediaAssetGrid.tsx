import { Check, Clipboard, Image as ImageIcon } from "lucide-react";
import type { MediaAsset } from "../../api/types";
import { formatBytes } from "./model";

export function MediaAssetGrid({
  assets,
  selectedUrl,
  onSelect,
  onCopy,
  emptyMessage = "No media assets found.",
}: {
  assets: MediaAsset[];
  selectedUrl?: string | null;
  onSelect?: (asset: MediaAsset) => void;
  onCopy?: (asset: MediaAsset) => void;
  emptyMessage?: string;
}) {
  if (!assets.length) {
    return (
      <div className="media-empty-state">
        <ImageIcon size={24} />
        <strong>{emptyMessage}</strong>
        <span>Upload an image or adjust the current search.</span>
      </div>
    );
  }

  return (
    <div className="media-grid">
      {assets.map((asset) => {
        const selected = selectedUrl === asset.url;
        return (
          <article className={`media-card ${selected ? "selected" : ""}`} key={asset.id}>
            <div className="media-card-image">
              <img
                alt={asset.alt}
                decoding="async"
                loading="lazy"
                referrerPolicy="no-referrer"
                src={asset.url}
              />
              {selected ? (
                <span className="media-selected-badge">
                  <Check size={13} /> Selected
                </span>
              ) : null}
            </div>
            <div className="media-card-body">
              <strong title={asset.alt}>{asset.alt}</strong>
              <span>
                {asset.width} × {asset.height} · {formatBytes(asset.sizeBytes)}
              </span>
              <small>{asset.contentType ?? "image/webp"}</small>
            </div>
            {onSelect || onCopy ? (
              <div className="media-card-actions">
                {onCopy ? (
                  <button
                    aria-label={`Copy URL for ${asset.alt}`}
                    className="icon-button"
                    onClick={() => onCopy(asset)}
                    title="Copy URL"
                    type="button"
                  >
                    <Clipboard size={15} />
                  </button>
                ) : null}
                {onSelect ? (
                  <button
                    className={selected ? "secondary-button" : ""}
                    disabled={selected}
                    onClick={() => onSelect(asset)}
                    type="button"
                  >
                    {selected ? "Selected" : "Use image"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
