import { describe, expect, it } from "vitest";
import type { WebsitePost } from "./api";
import {
  canAdvanceNewsPage,
  displayNewsDate,
  filterNewsPage,
  newsPageCategories,
} from "./model";

function post(id: string, category: string, headline: string): WebsitePost {
  return {
    id,
    headline,
    category,
    imageUrl: "https://example.com/post.jpg",
    date: "12 October 2026",
    summary: "News from Detroit",
    fullArticle: "Article content",
    timestamp: 1_760_000_000_000,
    sourceName: "LA Z",
    sourceUrl: "",
    adImageUrl: "",
  };
}

const items = [
  post("detroit-festival", "DETROIT", "Detroit Jazz Festival"),
  post("musica-concierto", "MÚSICA", "Concierto en Detroit"),
  post("otra-noticia", "NOVEDADES", "Community news"),
];

describe("Website News V1 table model", () => {
  it("searches only the supplied current page without changing server order", () => {
    expect(filterNewsPage(items, "dEtRoIt", "all").map((item) => item.id)).toEqual([
      "detroit-festival",
      "musica-concierto",
      "otra-noticia",
    ]);
    expect(filterNewsPage(items, "festival", "all").map((item) => item.id)).toEqual([
      "detroit-festival",
    ]);
    expect(filterNewsPage(items, "musica", "all").map((item) => item.id)).toEqual([
      "musica-concierto",
    ]);
  });

  it("combines category and search and preserves empty state", () => {
    expect(filterNewsPage(items, "Detroit", "MÚSICA").map((item) => item.id))
      .toEqual(["musica-concierto"]);
    expect(filterNewsPage(items, "Concert", "DETROIT")).toEqual([]);
  });

  it("derives category options only from current page", () => {
    expect(newsPageCategories(items)).toEqual(["DETROIT", "MÚSICA", "NOVEDADES"]);
  });

  it("has no invented global totals; next is based on cursor or cached page", () => {
    expect(canAdvanceNewsPage(0, 1, false)).toBe(false);
    expect(canAdvanceNewsPage(0, 1, true)).toBe(true);
    expect(canAdvanceNewsPage(0, 2, false)).toBe(true);
    expect(canAdvanceNewsPage(1, 2, false)).toBe(false);
  });

  it("preserves legacy localized date instead of replacing it", () => {
    expect(displayNewsDate(items[0])).toBe("12 October 2026");
    expect(displayNewsDate({ ...items[0], date: "", timestamp: Number.NaN }))
      .toBe("—");
  });
});
