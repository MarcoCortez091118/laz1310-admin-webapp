import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../api/client";
import { getWebsiteBanners } from "./api";

vi.mock("../../api/client", () => ({ apiRequest: vi.fn() }));

describe("website banners API boundary", () => {
  it("uses only the admin-scoped Website endpoint with GET", () => {
    getWebsiteBanners();
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banners",
      { method: "GET" },
      { signal: undefined },
    );
  });

  it("forwards cancellation without Mobile publication or Firebase calls", () => {
    const signal = new AbortController().signal;
    getWebsiteBanners(signal);
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/banners",
      { method: "GET" },
      { signal },
    );
  });
});
