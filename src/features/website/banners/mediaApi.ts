import { apiRequest, type ApiResult } from "../../../api/client";

export interface WebsiteBannerAsset {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  sizeBytes: number;
  contentType: string;
}

const ROOT = "/api/v1/admin/website/banner-media";

export function listWebsiteBannerMedia(
  limit = 100,
  signal?: AbortSignal,
): Promise<ApiResult<WebsiteBannerAsset[]>> {
  return apiRequest<WebsiteBannerAsset[]>(
    `${ROOT}?limit=${limit}`,
    { method: "GET" },
    { signal },
  );
}

export function uploadWebsiteBannerMedia(
  file: File,
  description: string,
  id: string = crypto.randomUUID(),
): Promise<ApiResult<WebsiteBannerAsset>> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return Promise.reject(new Error("Only JPEG, PNG and WebP images are supported."));
  }
  if (!file.size || file.size > 5 * 1024 * 1024) {
    return Promise.reject(new Error("Choose an image no larger than 5 MiB."));
  }
  const alt = description.trim() || "LA Z Website banner";
  return apiRequest<WebsiteBannerAsset>(
    `${ROOT}/${encodeURIComponent(id)}?alt=${encodeURIComponent(alt)}`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    },
  );
}
