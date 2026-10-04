import { useInfiniteQuery } from "@tanstack/react-query";
import { getParticipations } from "./api";

export const dynamicsQueryKeys = {
  participations: (dynamicId: string) => ["admin", "dynamics", dynamicId, "participations"] as const,
};

export function useParticipationsQuery(dynamicId: string | null, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: dynamicId ? dynamicsQueryKeys.participations(dynamicId) : ["admin", "dynamics", "none", "participations"],
    queryFn: ({ pageParam, signal }) => getParticipations(dynamicId!, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    enabled: Boolean(dynamicId) && enabled,
    retry: false,
  });
}
