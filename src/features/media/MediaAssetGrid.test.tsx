import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MediaAsset } from "../../api/types";
import { MediaAssetGrid } from "./MediaAssetGrid";

const sample = {
  id: "asset-1",
  alt: "LA Z square ad",
  url: "https://images.example.org/ad-square.webp",
  width: 1080,
  height: 1080,
  sizeBytes: 5000,
  contentType: "image/webp",
} as MediaAsset;

describe("Media picker asset interactions", () => {
  it("offers a keyboard-focusable thumbnail action inside Edit Draft", () => {
    const html = renderToStaticMarkup(
      <MediaAssetGrid assets={[sample]} onSelect={() => undefined} />,
    );
    expect(html).toContain('aria-label="Use image: LA Z square ad"');
    expect(html).toContain('class="media-image-select"');
    expect(html).toContain("Use image");
    expect(html).not.toContain("disabled");
  });

  it("permits choosing the currently selected asset again to close the picker", () => {
    const html = renderToStaticMarkup(
      <MediaAssetGrid
        assets={[sample]}
        selectedUrl={sample.url}
        onSelect={() => undefined}
      />,
    );
    expect(html).toContain("Use selected image");
    expect(html).not.toContain("disabled");
  });

  it("preserves media library read-only thumbnail when selection is unavailable", () => {
    const html = renderToStaticMarkup(<MediaAssetGrid assets={[sample]} />);
    expect(html).not.toContain('aria-label="Use image: LA Z square ad"');
    expect(html).not.toContain('class="media-image-select"');
  });
});
