import { beforeEach, describe, expect, it, vi } from "vitest";
import { readWebsiteFolder, websiteMediaFolders } from "./websiteMediaCatalog";
import { listWebsiteBannerMedia } from "../website/banners/mediaApi";
import { listShowMedia } from "../website/shows/api";
import { listPromotionMedia } from "../website/tickets/api";

vi.mock("../website/banners/mediaApi", () => ({ listWebsiteBannerMedia: vi.fn() }));
vi.mock("../website/shows/api", () => ({ listShowMedia: vi.fn() }));
vi.mock("../website/tickets/api", () => ({ listPromotionMedia: vi.fn() }));

const asset = {
  id: "image-001", alt: "Editorial artwork", url: "https://example.org/art.webp",
  width: 1024, height: 768, contentType: "image/webp", sizeBytes: 5000,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listWebsiteBannerMedia).mockResolvedValue({ data: [asset] } as never);
  vi.mocked(listShowMedia).mockResolvedValue({ data: [asset] } as never);
  vi.mocked(listPromotionMedia).mockResolvedValue({ data: [asset] } as never);
});

describe("Website editorial media folder isolation", () => {
  it("uses only the banner API when browsing Banners", async () => {
    expect(await readWebsiteFolder("banners")).toEqual([asset]);
    expect(listWebsiteBannerMedia).toHaveBeenCalledTimes(1);
    expect(listShowMedia).not.toHaveBeenCalled();
    expect(listPromotionMedia).not.toHaveBeenCalled();
  });
  it("uses only the Shows API for the Shows folder", async () => {
    expect(await readWebsiteFolder("shows")).toEqual([asset]);
    expect(listShowMedia).toHaveBeenCalledTimes(1);
    expect(listWebsiteBannerMedia).not.toHaveBeenCalled();
    expect(listPromotionMedia).not.toHaveBeenCalled();
  });
  it("uses only Ticket Promotions API for promotion artwork", async () => {
    expect(await readWebsiteFolder("promotions")).toEqual([asset]);
    expect(listPromotionMedia).toHaveBeenCalledTimes(1);
    expect(listWebsiteBannerMedia).not.toHaveBeenCalled();
    expect(listShowMedia).not.toHaveBeenCalled();
  });
  it("exposes explicit Website-only virtual collections", () => {
    expect(websiteMediaFolders.map(folder => folder.id)).toEqual([
      "banners", "shows", "promotions",
    ]);
  });
});
