import { apiRequest, type ApiResult } from "../../api/client";
import type { PublicState } from "../../api/types";
import { parseReleaseHistory, type ReleaseHistoryItem } from "./model";

export type ReleasePage = {
  data: ReleaseHistoryItem[];
};

export function getReleases(
  limit = 20,
  after?: string,
  signal?: AbortSignal,
): Promise<ReleasePage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<unknown>(
    `/api/v1/admin/releases?${params.toString()}`,
    { method: "GET" },
    { signal },
  ).then((result) => ({ data: parseReleaseHistory(result.data) }));
}

export function publishDraft(
  note: string,
  draftEtag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    "/api/v1/admin/publish",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    },
    { ifMatch: draftEtag, signal },
  );
}

export function rollbackRelease(
  releaseId: string,
  note: string,
  publicStateEtag: string,
  signal?: AbortSignal,
): Promise<ApiResult<PublicState>> {
  return apiRequest<PublicState>(
    `/api/v1/admin/releases/${encodeURIComponent(releaseId)}/rollback`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    },
    { ifMatch: publicStateEtag, signal },
  );
}
