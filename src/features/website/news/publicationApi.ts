import { apiRequest, type ApiResult } from "../../../api/client";
import type { WebsiteNewsDraft } from "./draftsApi";
import type { WebsitePost } from "./api";

export interface WebsitePublication {
  post: WebsitePost;
  revision: number;
  releaseId: string;
  draftRevision: number;
  publishedAt: string;
  publishedBy: string;
}

export interface WebsiteRelease extends WebsitePublication {
  id: string;
  slug: string;
  previousReleaseId: string | null;
  action: "publish" | "rollback";
}

export interface WebsiteReleaseHistory {
  items: WebsiteRelease[];
}

export const websitePublicationKeys = {
  all: ["admin", "website", "publications"] as const,
  byPost: (slug: string) => ["admin", "website", "publications", slug] as const,
};

function postPath(slug: string): string {
  return `/api/v1/admin/website/posts/${encodeURIComponent(slug)}`;
}

export function previewWebsiteDraft(slug: string): Promise<ApiResult<WebsiteNewsDraft>> {
  return apiRequest<WebsiteNewsDraft>(`${postPath(slug)}/preview`, { method: "GET" });
}

export function readWebsitePublication(slug: string): Promise<ApiResult<WebsitePublication>> {
  return apiRequest<WebsitePublication>(`${postPath(slug)}/publication`, { method: "GET" });
}

export function listWebsiteReleases(slug: string): Promise<ApiResult<WebsiteReleaseHistory>> {
  return apiRequest<WebsiteReleaseHistory>(`${postPath(slug)}/releases?limit=25`, { method: "GET" });
}

export function publishWebsiteDraft(
  slug: string, draftRevision: number,
): Promise<ApiResult<WebsiteRelease>> {
  return apiRequest<WebsiteRelease>(
    `${postPath(slug)}/publish`, { method: "POST" },
    { ifMatch: `"${draftRevision}"` },
  );
}

export function rollbackWebsiteRelease(
  slug: string, publicationRevision: number, releaseId: string,
): Promise<ApiResult<WebsiteRelease>> {
  return apiRequest<WebsiteRelease>(
    `${postPath(slug)}/rollback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    },
    { ifMatch: `"${publicationRevision}"` },
  );
}
