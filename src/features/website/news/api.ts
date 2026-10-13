import { apiRequest, type ApiResult } from "../../../api/client";

/** Typed view of the public legacy website posts, not native Mobile Pages or News. */
export interface WebsitePost {
  id: string;
  headline: string;
  imageUrl: string;
  category: string;
  date: string;
  summary: string;
  fullArticle: string;
  timestamp: number;
  sourceName: string;
  sourceUrl: string;
  adImageUrl: string;
}

export interface WebsitePostPage {
  items: WebsitePost[];
  nextCursor: string | null;
}

export const websiteNewsKeys = {
  all: ["admin", "website", "news"] as const,
};

export function listWebsitePosts(
  limit = 20,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<WebsitePostPage>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<WebsitePostPage>(
    `/api/v1/admin/website/posts?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
