import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Dynamic, ParticipationPage } from "../../api/types";

export function putDynamic(
  dynamic: Dynamic,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  return apiRequest<Draft>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamic.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dynamic),
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

export function getParticipations(
  dynamicId: string,
  after?: string | null,
  signal?: AbortSignal,
): Promise<ApiResult<ParticipationPage>> {
  const params = new URLSearchParams({ limit: "20" });
  if (after) params.set("after", after);
  return apiRequest<ParticipationPage>(
    `/api/v1/admin/dynamics/${encodeURIComponent(dynamicId)}/participations?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
