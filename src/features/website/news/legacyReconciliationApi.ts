import { apiRequest, type ApiResult } from "../../../api/client";
import type { WebsitePost } from "./api";
import type { WebsiteNewsDraft } from "./draftsApi";

export type WebsiteLegacyStatus = "ready" | "missing_baseline" | "changed";

export interface WebsiteLegacyReview {
  draft: WebsiteNewsDraft;
  legacyPost: WebsitePost;
  legacyFingerprint: string;
  status: WebsiteLegacyStatus;
}

function draftPath(slug: string): string {
  return `/api/v1/admin/website/posts/${encodeURIComponent(slug)}/draft`;
}

export function reviewWebsiteLegacy(slug: string): Promise<ApiResult<WebsiteLegacyReview>> {
  return apiRequest<WebsiteLegacyReview>(
    `${draftPath(slug)}/legacy-review`, { method: "GET" },
  );
}

export function reconcileWebsiteLegacy(
  slug: string, draftRevision: number, legacyFingerprint: string,
): Promise<ApiResult<WebsiteNewsDraft>> {
  return apiRequest<WebsiteNewsDraft>(
    `${draftPath(slug)}/reconcile-legacy`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legacyFingerprint }),
    },
    { ifMatch: `"${draftRevision}"` },
  );
}
