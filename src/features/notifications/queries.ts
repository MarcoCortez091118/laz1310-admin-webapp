import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getNotificationCampaign,
  listNotificationCampaigns,
  notificationsQueryKeys,
} from "./api";
import { findAdminUserByEmail, findAdminUserById, listAdminUsers } from "./users";

export const notificationUserQueryKey = ["admin", "notification-users"] as const;

export function useNotificationCampaignsQuery() {
  return useInfiniteQuery({
    queryKey: notificationsQueryKeys.list,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listNotificationCampaigns(20, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
  });
}

export function useNotificationCampaignQuery(id: string | null) {
  return useQuery({
    queryKey: id ? notificationsQueryKeys.detail(id) : ["admin", "notifications", "none"],
    queryFn: ({ signal }) => getNotificationCampaign(id!, signal),
    enabled: Boolean(id),
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === "queued" || status === "sending" ? 5000 : false;
    },
  });
}

export function useNotificationUsersQuery(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: notificationUserQueryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => listAdminUsers(50, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}

export function useNotificationUserEmailQuery(email: string, enabled: boolean) {
  const normalized = email.trim().toLowerCase();
  return useQuery({
    queryKey: [...notificationUserQueryKey, "email", normalized],
    queryFn: ({ signal }) => findAdminUserByEmail(normalized, signal),
    enabled: enabled && normalized.length >= 3 && normalized.includes("@"),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    retry: false,
  });
}

export function useNotificationUserByIdQuery(userId: string, enabled: boolean) {
  const normalized = userId.trim();
  return useQuery({
    queryKey: [...notificationUserQueryKey, "id", normalized],
    queryFn: ({ signal }) => findAdminUserById(normalized, signal),
    enabled: enabled && Boolean(normalized),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    retry: false,
  });
}
