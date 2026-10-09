import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Page, PublicState } from "../../api/types";

export const adminQueryKeys = {
  draft: ["admin", "draft"] as const,
  preview: ["admin", "preview"] as const,
  publicState: ["admin", "public-state"] as const,
  releases: ["admin", "releases"] as const,
  pageStatus: (slug: string) => ["admin", "pages", slug, "status"] as const,
  configurationStatus: ["admin", "configuration", "status"] as const,
};

export interface ConfigurationPublicationStatus {
  status: "draft" | "live" | "changes_pending";
  releaseId: string | null;
  publishedAt: string | null;
}

export interface PagePublicationStatus {
  slug: string;
  status: "absent" | "draft" | "live" | "changes_pending";
  existsInDraft: boolean;
  existsInPublished: boolean;
  releaseId: string | null;
  publishedAt: string | null;
}

export function getDraft(signal?: AbortSignal): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    "/api/v1/admin/draft",
    { method: "GET" },
    { signal },
  );
}

export function getPreview(signal?: AbortSignal): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    "/api/v1/admin/preview",
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

export function publishDraft(
  note: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    "/api/v1/admin/publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    },
    { ifMatch: etag, signal },
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


export function getPagePublicationStatus(
  slug: string,
  signal?: AbortSignal,
): Promise<ApiResult<PagePublicationStatus>> {
  return apiRequest<PagePublicationStatus>(
    `/api/v1/admin/pages/${encodeURIComponent(slug)}/status`,
    { method: "GET" },
    { signal },
  );
}

export function publishPage(
  slug: string,
  note: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    `/api/v1/admin/pages/${encodeURIComponent(slug)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    },
    { ifMatch: etag, signal },
  );
}


export function putConfiguration(
  configuration: unknown,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    "/api/v1/admin/configuration",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configuration),
    },
    { ifMatch: etag, signal },
  );
}

export function getConfigurationPublicationStatus(
  signal?: AbortSignal,
): Promise<ApiResult<ConfigurationPublicationStatus>> {
  return apiRequest<ConfigurationPublicationStatus>(
    "/api/v1/admin/configuration/status",
    { method: "GET" },
    { signal },
  );
}

export function publishConfiguration(
  note: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    "/api/v1/admin/configuration/publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    },
    { ifMatch: etag, signal },
  );
}
