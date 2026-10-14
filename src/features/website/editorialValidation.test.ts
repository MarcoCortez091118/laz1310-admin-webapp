import { describe, expect, it } from "vitest";
import {
  bannerArtworkValid, bannerInfoValid, isPublicHttpsUrl, promotionArtworkValid,
  promotionInfoValid, showArtworkValid, showInfoValid,
} from "./editorialValidation";

describe("three-step Website editorial validation", () => {
  it("accepts only public HTTPS image/link URLs without embedded credentials", () => {
    expect(isPublicHttpsUrl("https://laz1310.com/p.webp")).toBe(true);
    for (const value of ["", "https://", "http://example.org/a.png",
      "javascript:alert(1)", "https://user:secret@example.org/a.webp",
      "https:///"]) {
      expect(isPublicHttpsUrl(value)).toBe(false);
    }
  });

  it("validates show details independently from poster selection", () => {
    const show = {
      title: "LA Z Detroit", schedule: "Daily", position: 0,
      linkUrl: null, imageUrl: "",
    };
    expect(showInfoValid(show)).toBe(true);
    expect(showArtworkValid(show)).toBe(false);
    expect(showArtworkValid({ ...show, imageUrl: "https://example.org/show.webp" })).toBe(true);
    expect(showInfoValid({ ...show, title: "  " })).toBe(false);
    expect(showInfoValid({ ...show, position: -1 })).toBe(false);
  });

  it("requires a valid banner preview but does not require a link", () => {
    const banner = { id: "b1", url: "", linkUrl: null, active: true };
    expect(bannerInfoValid(banner)).toBe(true);
    expect(bannerArtworkValid(banner)).toBe(false);
    expect(bannerArtworkValid({ ...banner, url: "https://example.org/banner.webp" })).toBe(true);
    expect(bannerInfoValid({ ...banner, linkUrl: "http://not-safe.example.org" })).toBe(false);
  });

  it("requires promotion event metadata, a valid action and one or both images", () => {
    const promo = {
      eventName: "Promotion", position: 1,
      webUrl: "", mobileUrl: "", actionType: "formulario" as const,
      linkUrl: null,
    };
    expect(promotionInfoValid(promo)).toBe(true);
    expect(promotionArtworkValid(promo)).toBe(false);
    expect(promotionArtworkValid({ ...promo, mobileUrl: "https://example.org/m.webp" })).toBe(true);
    expect(promotionArtworkValid({
      ...promo, mobileUrl: "https://example.org/m.webp", webUrl: "http://example.org/x",
    })).toBe(false);
    expect(promotionInfoValid({ ...promo, actionType: "enlace", linkUrl: null })).toBe(false);
    expect(promotionInfoValid({
      ...promo, actionType: "enlace", linkUrl: "https://laz1310.com/tickets",
    })).toBe(true);
  });
});
