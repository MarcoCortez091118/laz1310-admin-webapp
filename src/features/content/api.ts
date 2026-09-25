import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Page, PublicState } from "../../api/types";

export const adminQueryKeys = {
  draft: ["admin", "draft"] as const,
  publicState: ["admin", "public-state"] as const,
};

export function getDraft(signal?: AbortSignal): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    "/api/v1/admin/draft",
    { method: "GET" },
    { signal },
  );
}

export function getPublicState(signal?: AbortSignal): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    "/api/v1/admin/public-state",
    { method: "GET" },
    { signal },
  );
}

export function putPage(
  page: Page,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/pages/${encodeURIComponent(page.slug)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(page),
    },
    { ifMatch: etag, signal },
  );
}

export function deletePage(
  slug: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/pages/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
    { ifMatch: etag, signal },
  );
}
