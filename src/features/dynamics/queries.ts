import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { dynamicsQueryKeys, getDynamicParticipations, getDynamics } from "./api";

export function useDynamicsQuery() {
  return useQuery({
    queryKey: dynamicsQueryKeys.list,
    queryFn: ({ signal }) => getDynamics(signal),
    retry: false,
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
