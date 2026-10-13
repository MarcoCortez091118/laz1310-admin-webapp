import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import { listWebsiteBannerMedia, uploadWebsiteBannerMedia } from "./mediaApi";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website-only managed banner images", () => {
  it("uses isolated authenticated FastAPI endpoint for media listing", () => {
    const signal = new AbortController().signal;
    void listWebsiteBannerMedia(30, signal);
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/banner-media?limit=30",
      { method: "GET" },
      { signal },
    );
  });

  it("uploads a binary image to Website, never native Mobile media routes", () => {
    const image = new File(["image"], "website.png", { type: "image/png" });
    void uploadWebsiteBannerMedia(image, "Website Hero", "example-asset");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/banner-media/example-asset?alt=Website%20Hero",
      { method: "PUT", headers: { "Content-Type": "image/png" }, body: image },
    );
  });

  it("rejects unsafe file formats and sizes before network request", async () => {
    const before = vi.mocked(apiRequest).mock.calls.length;
    await expect(uploadWebsiteBannerMedia(
      new File(["raw"], "a.svg", { type: "image/svg+xml" }), "Bad",
    )).rejects.toThrow("Only JPEG");
    await expect(uploadWebsiteBannerMedia(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.png", { type: "image/png" }), "Too big",
    )).rejects.toThrow("5 MiB");
    expect(apiRequest).toHaveBeenCalledTimes(before);
  });
});
