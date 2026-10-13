import { describe, expect, it } from "vitest";
import {
  advertisingImageShape,
  safeAdvertisingImageUrl,
  WEBSITE_AD_ASPECT_RATIO,
  WEBSITE_AD_RECOMMENDED_PX,
} from "./advertisingImage";

describe("Website News advertising image contract", () => {
  it("matches the actual public website square advertising slot", () => {
    expect(WEBSITE_AD_ASPECT_RATIO).toBe("1:1");
    expect(WEBSITE_AD_RECOMMENDED_PX).toBe(1080);
    expect(advertisingImageShape(1080, 1080)).toBe("square");
    expect(advertisingImageShape(1200, 1200)).toBe("square");
    expect(advertisingImageShape(1200, 628)).toBe("will-crop");
    expect(advertisingImageShape(0, 1080)).toBe("unknown");
    expect(advertisingImageShape(Number.NaN, 200)).toBe("unknown");
  });

  it("accepts public HTTPS media URLs including Firebase managed assets", () => {
    const firebase = "https://firebasestorage.googleapis.com/v0/b/example/o/ads%2Fsquare.webp?alt=media&token=abc";
    expect(safeAdvertisingImageUrl(firebase)).toBe(firebase);
    expect(safeAdvertisingImageUrl("  https://images.example.org/square.webp  "))
      .toBe("https://images.example.org/square.webp");
  });

  it("rejects local files, unsafe protocols and malformed URLs", () => {
    for (const url of [
      "", " ", "http://example.com/ad.png", "javascript:alert(1)",
      "data:image/svg+xml;base64,abc", "file:///Users/name/ad.png",
      "//example.com/ad.png", "https://user:pass@example.com/ad.jpg",
      "this-is-not-an-image-url",
    ]) {
      expect(safeAdvertisingImageUrl(url)).toBeNull();
    }
  });
});
