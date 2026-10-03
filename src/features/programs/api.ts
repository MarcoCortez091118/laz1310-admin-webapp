import { apiRequest, type ApiResult } from "../../api/client";
import type { Draft, Station } from "../../api/types";

export function putStation(
  station: Station,
  etag: string,
  signal?: AbortSignal,
): Promise<ApiResult<Draft>> {
  if (!station.id) {
    throw new Error("Station ID is required before updating programs.");
  }

  return apiRequest<Draft>(
    `/api/v1/admin/stations/${encodeURIComponent(station.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(station),
    },
    { ifMatch: etag, signal },
  );
}
