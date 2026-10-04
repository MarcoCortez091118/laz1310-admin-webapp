import { apiRequest, type ApiResult } from "../../api/client";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  profileCompleted: boolean;
  locale: string | null;
  timezone: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface AdminUserPage {
  items: AdminUserSummary[];
  nextCursor: string | null;
}

export function listAdminUsers(
  limit = 50,
  after?: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminUserPage>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return apiRequest<AdminUserPage>(
    `/api/v1/admin/users?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}

export function findAdminUserByEmail(
  email: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminUserPage>> {
  const params = new URLSearchParams({ limit: "10", email: email.trim() });
  return apiRequest<AdminUserPage>(
    `/api/v1/admin/users?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
