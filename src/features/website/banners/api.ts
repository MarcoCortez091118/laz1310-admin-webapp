import { apiRequest, type ApiResult } from "../../../api/client";

export interface WebsiteBanner {
  id: string;
  url: string;
  linkUrl: string | null;
  active: boolean;
  placements?: ("home" | "programacion" | "actividades")[];
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface WebsiteBannerContent {
  desktop: WebsiteBanner[];
  mobile: WebsiteBanner[];
}

export interface WebsiteBannerDraft {
  revision: number;
  content: WebsiteBannerContent;
  origin: "new" | "legacy";
  legacyFingerprint: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface WebsiteBannerPublication {
  revision: number;
  draftRevision: number;
  releaseId: string;
  content: WebsiteBannerContent;
  publishedAt: string;
  publishedBy: string;
}

export interface WebsiteBannerRelease extends WebsiteBannerPublication {
  id: string;
  action: "publish" | "rollback";
  previousReleaseId: string | null;
}

export interface WebsiteLegacyBanners {
  source: "settings/banners";
  sourceExists: boolean;
  fingerprint: string | null;
  content: WebsiteBannerContent | null;
  warnings: string[];
}

export const websiteBannerKeys = {
  draft: ["admin", "website", "banners", "draft"] as const,
  legacy: ["admin", "website", "banners", "legacy"] as const,
  publication: ["admin", "website", "banners", "publication"] as const,
  releases: ["admin", "website", "banners", "releases"] as const,
};

const ROOT = "/api/v1/admin/website/banners";

export function readBannerDraft(): Promise<ApiResult<WebsiteBannerDraft>> {
  return apiRequest<WebsiteBannerDraft>(ROOT + "/draft");
}

export function readLegacyBanners(): Promise<ApiResult<WebsiteLegacyBanners>> {
  return apiRequest<WebsiteLegacyBanners>(ROOT + "/legacy");
}

export function importLegacyBanners(fingerprint: string): Promise<ApiResult<WebsiteBannerDraft>> {
  return apiRequest<WebsiteBannerDraft>(
    ROOT + "/draft/import",
    {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint }),
    },
    { ifMatch: '"0"' },
  );
}

export function saveBannerDraft(
  revision: number, content: WebsiteBannerContent,
): Promise<ApiResult<WebsiteBannerDraft>> {
  return apiRequest<WebsiteBannerDraft>(
    ROOT + "/draft",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    },
    { ifMatch: `"${revision}"` },
  );
}

export function readBannerPublication(): Promise<ApiResult<WebsiteBannerPublication>> {
  return apiRequest<WebsiteBannerPublication>(ROOT + "/publication");
}

export function readBannerReleases(): Promise<ApiResult<{items: WebsiteBannerRelease[]}>> {
  return apiRequest<{items: WebsiteBannerRelease[]}>(ROOT + "/releases?limit=25");
}

export function publishBannerDraft(revision: number): Promise<ApiResult<WebsiteBannerRelease>> {
  return apiRequest<WebsiteBannerRelease>(
    ROOT + "/publish", { method: "POST" }, { ifMatch: `"${revision}"` },
  );
}

export function rollbackBannerRelease(
  revision: number, releaseId: string,
): Promise<ApiResult<WebsiteBannerRelease>> {
  return apiRequest<WebsiteBannerRelease>(
    ROOT + "/rollback",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    },
    { ifMatch: `"${revision}"` },
  );
}
