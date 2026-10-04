import { apiRequest, type ApiResult } from "../../api/client";
import type { NotificationCategory } from "./model";

export interface AdminNotificationPreferences {
  general: boolean;
  radio: boolean;
  programs: boolean;
  dynamics: boolean;
}

export interface AdminNotificationStatus {
  preferences: AdminNotificationPreferences;
  registeredDeviceCount: number;
  notificationsEnabledDeviceCount: number;
  pushEligibleDeviceCount: number;
  pushEligible: boolean;
}

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
  notificationStatus?: AdminNotificationStatus;
}

export interface AdminUserPage {
  items: AdminUserSummary[];
  nextCursor: string | null;
}

export function userAllowsCategory(user: AdminUserSummary, category: NotificationCategory): boolean {
  return Boolean(user.notificationStatus?.preferences?.[category]);
}

export function userCanReceivePush(user: AdminUserSummary, category: NotificationCategory): boolean {
  return Boolean(user.notificationStatus?.pushEligible && userAllowsCategory(user, category));
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

export function findAdminUserById(
  userId: string,
  signal?: AbortSignal,
): Promise<ApiResult<AdminUserPage>> {
  const params = new URLSearchParams({ limit: "1", userId: userId.trim() });
  return apiRequest<AdminUserPage>(
    `/api/v1/admin/users?${params.toString()}`,
    { method: "GET" },
    { signal },
  );
}
