import { apiRequest, type ApiResult } from "../../api/client";

export interface UserDynamicParticipation {
  id: string;
  dynamicId: string;
  dynamicTitle: string | null;
  status: "accepted";
  submittedAt: string;
}

export interface UserParticipationPage {
  items: UserDynamicParticipation[];
  nextCursor: string | null;
}

/** Admin-only, metadata-only history. Answers and Firebase UID never reach the UI. */
export function getUserParticipationHistory(
  userId: string,
  limit = 20,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<UserParticipationPage>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<UserParticipationPage>(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/participations?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
