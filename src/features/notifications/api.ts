import { apiRequest, type ApiResult } from "../../api/client";
import type { CampaignInput, CampaignPage, NotificationCampaign } from "./model";

export const notificationsQueryKeys = {
  list: ["admin", "notifications"] as const,
  detail: (id: string) => ["admin", "notifications", id] as const,
};

export function listNotificationCampaigns(
  limit = 20,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<CampaignPage>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<CampaignPage>(
    `/api/v1/admin/notifications?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}

export function getNotificationCampaign(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<NotificationCampaign>> {
  return apiRequest<NotificationCampaign>(
    `/api/v1/admin/notifications/${encodeURIComponent(id)}`,
    { method: "GET" },
    { signal },
  );
}

export function createNotificationCampaign(
  payload: CampaignInput,
  signal?: AbortSignal,
): Promise<ApiResult<NotificationCampaign>> {
  return apiRequest<NotificationCampaign>(
    "/api/v1/admin/notifications",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { signal },
  );
}

export function replaceNotificationCampaign(
  id: string,
  payload: CampaignInput,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<NotificationCampaign>> {
  return apiRequest<NotificationCampaign>(
    `/api/v1/admin/notifications/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { ifMatch: etag, signal },
  );
}

export function sendNotificationCampaign(
  id: string,
  signal?: AbortSignal,
): Promise<ApiResult<NotificationCampaign>> {
  return apiRequest<NotificationCampaign>(
    `/api/v1/admin/notifications/${encodeURIComponent(id)}/send`,
    { method: "POST" },
    { signal },
  );
}
