import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import {
  listWebsiteReleases, previewWebsiteDraft, publishWebsiteDraft,
  readWebsitePublication, rollbackWebsiteRelease,
} from "./publicationApi";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website News publish and rollback API isolation", () => {
  it("previews the exact Website draft with authenticated FastAPI request", () => {
    previewWebsiteDraft("news-one");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/news-one/preview", { method: "GET" },
    );
  });

  it("publishes only the requested Website draft revision", () => {
    publishWebsiteDraft("news-one", 5);
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/news-one/publish",
      { method: "POST" },
      { ifMatch: '"5"' },
    );
  });

  it("uses a separate published revision for rollback and sends exact release ID", () => {
    rollbackWebsiteRelease("news-one", 8, "123e4567-e89b-12d3-a456-426614174000");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/news-one/rollback",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: "123e4567-e89b-12d3-a456-426614174000" }),
      },
      { ifMatch: '"8"' },
    );
    readWebsitePublication("news-one");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/news-one/publication",
      { method: "GET" },
    );
    listWebsiteReleases("news-one");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/news-one/releases?limit=25",
      { method: "GET" },
    );
  });
});
