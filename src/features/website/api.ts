import { apiRequest, type ApiResult } from "../../api/client";

/** This source is the legacy website's responsive hero, NOT React Native content. */
export interface WebsiteBanner {
  id: string;
  url: string;
  linkUrl: string | null;
}

export interface WebsiteBannerInventory {
  source: "settings/banners";
  sourceExists: boolean;
  desktop: WebsiteBanner[];
  mobile: WebsiteBanner[];
  warnings: string[];
}

/** Read-only contract: no direct Firebase calls and no Mobile Draft/Publish. */
export function getWebsiteBanners(
  signal?: AbortSignal,
): Promise<ApiResult<WebsiteBannerInventory>> {
  return apiRequest<WebsiteBannerInventory>(
    "/api/v1/admin/website/banners",
    { method: "GET" },
    { signal },
  );
}
