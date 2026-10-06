import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Dynamic, ParticipationPage, PublicState } from "../../api/types";

export interface DynamicTrashItem {
  id: string;
  dynamicId: string;
  snapshot: Dynamic;
  snapshotDigest: string;
  deletedAt: string;
  deletedBy: string;
  sourceDraftRevision: number;
  resultingDraftRevision: number;
  restoredAt: string | null;
  restoredBy: string | null;
  published: boolean;
}

export interface PublishedOutsideDraftItem {
  dynamic: Dynamic;
  releaseId: string;
  publishedAt: string;
}

export interface ParticipationServiceStatus {
  configured: boolean;
  submissionsEnabled: boolean;
  retentionDays: number;
}

export const dynamicsQueryKeys = {
  list: ["admin", "dynamics"] as const,
  trash: ["admin", "dynamics", "trash"] as const,
  publishedOutsideDraft: ["admin", "dynamics", "published-outside-draft"] as const,
  participationStatus: ["admin", "dynamics", "participation-status"] as const,
  participations: (dynamicId: string) => ["admin", "dynamics", dynamicId, "participations"] as const,
};

export function getDynamics(signal?: AbortSignal): Promise<ApiResult<Dynamic[]>> {
  return apiRequest<Dynamic[]>(
    "/api/v1/admin/dynamics",
    { method: "GET" },
    { signal },
  );
}

export function putDynamic(
  dynamicId: string,
  payload: Dynamic,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamicId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { ifMatch: etag, signal },
  );
}

export function deleteDynamic(
  dynamicId: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamicId)}`,
    { method: "DELETE" },
    { ifMatch: etag, signal },
  );
}

export function publishDynamic(
  dynamicId: string,
  note: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamicId)}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    },
    { ifMatch: etag, signal },
  );
}

export function getDynamicTrash(
  limit = 100,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<DynamicTrashItem[]>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<DynamicTrashItem[]>(
    `/api/v1/admin/dynamics/trash?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}

export function getPublishedOutsideDraft(
  signal?: AbortSignal,
): Promise<ApiResult<PublishedOutsideDraftItem[]>> {
  return apiRequest<PublishedOutsideDraftItem[]>(
    "/api/v1/admin/dynamics/published-outside-draft",
    { method: "GET" },
    { signal },
  );
}

export function restoreDynamic(
  trashId: string,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/dynamics/trash/${encodeURIComponent(trashId)}/restore`,
    { method: "POST" },
    { ifMatch: etag, signal },
  );
}

export function getParticipationServiceStatus(
  signal?: AbortSignal,
): Promise<ApiResult<ParticipationServiceStatus>> {
  return apiRequest<ParticipationServiceStatus>(
    "/api/v1/admin/dynamics/participation-status",
    { method: "GET" },
    { signal },
  );
}

export function getDynamicParticipations(
  dynamicId: string,
  limit = 20,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<ParticipationPage>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);

  return apiRequest<ParticipationPage>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamicId)}/participations?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
