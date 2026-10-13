import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import {
  importLegacyBanners, publishBannerDraft, readBannerDraft, readBannerPublication,
  readBannerReleases, readLegacyBanners, rollbackBannerRelease, saveBannerDraft,
} from "./api";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website Banners isolated API contract", () => {
  it("reads Website-only state instead of native Mobile drafts", () => {
    readBannerDraft();
    readLegacyBanners();
    readBannerPublication();
    readBannerReleases();
    expect(vi.mocked(apiRequest).mock.calls.map((call) => call[0])).toEqual([
      "/api/v1/admin/website/banners/draft",
      "/api/v1/admin/website/banners/legacy",
      "/api/v1/admin/website/banners/publication",
      "/api/v1/admin/website/banners/releases?limit=25",
    ]);
  });

  it("uses If-Match for import, edits and administrator publication", () => {
    importLegacyBanners();
    saveBannerDraft(3, {
      desktop: [{ id: "hero", url: "https://example.org/a.webp", linkUrl: null, active: true }],
      mobile: [],
    });
    publishBannerDraft(4);
    rollbackBannerRelease(5, "02dc13ff-9d79-4a1d-aedb-e9a7ad4e8f0e");

    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banners/draft/import", { method: "POST" }, { ifMatch: '"0"' },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banners/draft",
      expect.objectContaining({ method: "PUT", body: expect.stringContaining('"desktop"') }),
      { ifMatch: '"3"' },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banners/publish", { method: "POST" }, { ifMatch: '"4"' },
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banners/rollback",
      expect.objectContaining({ method: "POST", body: expect.stringContaining('"releaseId"') }),
      { ifMatch: '"5"' },
    );
    expect(vi.mocked(apiRequest).mock.calls.every((call) =>
      call[0].startsWith("/api/v1/admin/website/banners"),
    )).toBe(true);
  });
});
