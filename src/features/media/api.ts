import { apiRequest, type ApiResult } from "../../api/client";
import type { MediaAsset } from "../../api/types";

export type MediaAssetId = ReturnType<Crypto["randomUUID"]>;

export const mediaQueryKeys = {
  all: ["admin", "media"] as const,
  list: (limit: number) => ["admin", "media", "list", limit] as const,
};

export function listMedia(
  limit: number,
  after?: MediaAssetId | null,
  signal?: AbortSignal,
): Promise<ApiResult<MediaAsset[]>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<MediaAsset[]>(`/api/v1/admin/media?${params.toString()}`, {}, { signal });
}

export function uploadMedia(
  file: File,
  alt: string,
  assetId: MediaAssetId = crypto.randomUUID(),
  signal?: AbortSignal,
): Promise<ApiResult<MediaAsset>> {
  const params = new URLSearchParams({ alt: alt.trim() });
  return apiRequest<MediaAsset>(
    `/api/v1/admin/media/${encodeURIComponent(assetId)}?${params.toString()}`,
    {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    },
    { signal },
  );
}
