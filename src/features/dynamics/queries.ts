import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  dynamicsQueryKeys,
  getDynamicParticipations,
  getDynamics,
  getDynamicTrash,
  getParticipationServiceStatus,
  getPublishedOutsideDraft,
} from "./api";

export function useDynamicsQuery() {
  return useQuery({
    queryKey: dynamicsQueryKeys.list,
    queryFn: ({ signal }) => getDynamics(signal),
    retry: false,
  });
}

export function useDynamicTrashQuery(enabled = true) {
  return useQuery({
    queryKey: dynamicsQueryKeys.trash,
    queryFn: ({ signal }) => getDynamicTrash(100, undefined, signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePublishedOutsideDraftQuery(enabled = true) {
  return useQuery({
    queryKey: dynamicsQueryKeys.publishedOutsideDraft,
    queryFn: ({ signal }) => getPublishedOutsideDraft(signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useParticipationServiceStatusQuery(enabled: boolean) {
  return useQuery({
    queryKey: dynamicsQueryKeys.participationStatus,
    queryFn: ({ signal }) => getParticipationServiceStatus(signal),
    enabled,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useDynamicParticipationsQuery(dynamicId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: dynamicId
      ? dynamicsQueryKeys.participations(dynamicId)
      : ["admin", "dynamics", "none", "participations"],
    queryFn: ({ pageParam, signal }) =>
      getDynamicParticipations(dynamicId ?? "", 20, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: Boolean(dynamicId) && enabled,
    retry: false,
    staleTime: 60_000,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
