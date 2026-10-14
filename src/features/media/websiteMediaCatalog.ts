import { listWebsiteBannerMedia } from "../website/banners/mediaApi";
import { listShowMedia } from "../website/shows/api";
import { listPromotionMedia } from "../website/tickets/api";

/** Stable FastAPI media namespaces; these are not unrestricted GCS directory paths. */
export type WebsiteMediaFolder = "banners" | "shows" | "promotions";
export interface WebsiteImageAsset {
  id: string; url: string; alt: string;
  width: number; height: number; sizeBytes: number; contentType: string;
}
export const websiteMediaFolders: {
  id: WebsiteMediaFolder; label: string; description: string;
}[] = [
  { id: "banners", label: "Website Banners", description: "Desktop and mobile hero artwork" },
  { id: "shows", label: "Website Shows", description: "Program posters and artwork" },
  { id: "promotions", label: "Ticket Promotions", description: "Registration and promotion artwork" },
];

/** Exactly one scoped backend endpoint per folder. */
export async function readWebsiteFolder(
  folder: WebsiteMediaFolder,
): Promise<WebsiteImageAsset[]> {
  switch (folder) {
    case "banners": return (await listWebsiteBannerMedia()).data;
    case "shows": return (await listShowMedia()).data;
    case "promotions": return (await listPromotionMedia()).data;
  }
}
