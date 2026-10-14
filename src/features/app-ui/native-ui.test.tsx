import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NativeArtworkPreview } from "./NativeArtworkPreview";
import { NativeEditorSteps } from "./NativeEditorSteps";

describe("native Android/iOS editorial visual primitives", () => {
  it("constrains banner previews and preserves accessible alt text", () => {
    const html = renderToStaticMarkup(<NativeArtworkPreview
      src="https://example.org/very-wide-banner.webp"
      alt="LA Z Detroit carousel" shape="banner" />);
    expect(html).toContain('alt="LA Z Detroit carousel"');
    expect(html).toContain("object-fit:contain");
    expect(html).toContain("overflow:hidden");
    expect(html).toMatch(/aspect-ratio:\s*3\s*\/\s*1/);
  });

  it("keeps tall artwork inside a finite poster box without cropping", () => {
    const html = renderToStaticMarkup(<NativeArtworkPreview
      src="https://example.org/tall-poster.webp"
      alt="Radio poster" shape="poster" maxHeight={220}/>);
    expect(html).toContain("object-fit:contain");
    expect(html).toContain("max-height:220px");
  });

  it("fails closed on empty or insecure artwork links", () => {
    for (const src of ["", "http://example.org/unsafe.png", null]) {
      const html = renderToStaticMarkup(
        <NativeArtworkPreview src={src} alt="Artwork"/>,
      );
      expect(html).not.toContain("<img");
      expect(html).toContain(src ? "Preview unavailable" : "No artwork");
    }
  });

  it("exposes a labeled progress indicator for non-publishing editor steps", () => {
    const html = renderToStaticMarkup(<NativeEditorSteps active={1}/>);
    expect(html).toContain("Information");
    expect(html).toContain("Artwork");
    expect(html).toContain("Review");
    expect(html).toContain("Step 2 of 3");
    expect(html).toContain("Android/iOS editor progress");
  });
});
