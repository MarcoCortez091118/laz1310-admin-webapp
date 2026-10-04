import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getNotificationCampaign,
  listNotificationCampaigns,
  notificationsQueryKeys,
} from "./api";

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
  });
}
