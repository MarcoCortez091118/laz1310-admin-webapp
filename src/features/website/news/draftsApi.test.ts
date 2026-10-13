import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import {
  importWebsiteDraft, listWebsiteDrafts, readWebsiteDraft,
  saveWebsiteDraft,
} from "./draftsApi";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

const content = {
  headline: "LA Z 1310 Detroit",
  category: "DETROIT",
  summary: "Local news for the Detroit community",
  fullArticle: "Our editorial article body with legitimate information.",
  imageUrl: "https://example.org/cover.webp",
  sourceName: "LA Z 1310",
  sourceUrl: "",
  adImageUrl: "",
};

describe("Website News V2 draft contract", () => {
  it("never saves via Mobile API or directly into Firebase", () => {
    saveWebsiteDraft("detroit-news", 4, content);
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/detroit-news/draft",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      },
      { ifMatch: '"4"' },
    );
  });

  it("supports opening, explicit import, and paginated drafts", () => {
    readWebsiteDraft("original-news");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/original-news/draft",
      { method: "GET" },
      { signal: undefined },
    );
    importWebsiteDraft("original-news");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/original-news/draft/import",
      { method: "POST" },
      { ifMatch: '"0"' },
    );
    listWebsiteDrafts(20, "previous-article");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/drafts?limit=20&after=previous-article",
      { method: "GET" },
      { signal: undefined },
    );
  });
});
