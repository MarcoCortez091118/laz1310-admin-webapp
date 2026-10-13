import { apiRequest, type ApiResult } from "../../../api/client";
import type { WebsitePost } from "./api";

export type WebsiteDraftInput = Pick<
  WebsitePost,
  "headline" | "category" | "summary" | "fullArticle" | "imageUrl" |
    "sourceName" | "sourceUrl" | "adImageUrl"
>;

export interface WebsiteNewsDraft {
  revision: number;
  post: WebsitePost;
  origin: "new" | "legacy";
  updatedAt: string;
  updatedBy: string;
}

export interface WebsiteDraftPage {
  items: WebsiteNewsDraft[];
  nextCursor: string | null;
}

export const websiteDraftKeys = ["admin", "website", "post-drafts"] as const;

function pathFor(slug: string): string {
  return `/api/v1/admin/website/posts/${encodeURIComponent(slug)}/draft`;
}

export function readWebsiteDraft(slug: string, signal?: AbortSignal) {
  return apiRequest<WebsiteNewsDraft>(pathFor(slug), { method: "GET" }, { signal });
}

export function listWebsiteDrafts(limit = 50, after?: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<WebsiteDraftPage>(
    `/api/v1/admin/website/drafts?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}

export function importWebsiteDraft(slug: string): Promise<ApiResult<WebsiteNewsDraft>> {
  return apiRequest<WebsiteNewsDraft>(
    `${pathFor(slug)}/import`,
    { method: "POST" },
    { ifMatch: '"0"' },
  );
}

export function saveWebsiteDraft(
  slug: string,
  revision: number,
  content: WebsiteDraftInput,
): Promise<ApiResult<WebsiteNewsDraft>> {
  return apiRequest<WebsiteNewsDraft>(
    pathFor(slug),
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) },
    { ifMatch: `"${revision}"` },
  );
}
