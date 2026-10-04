import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Dynamic, ParticipationPage } from "../../api/types";

export const dynamicsQueryKeys = {
  list: ["admin", "dynamics"] as const,
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
