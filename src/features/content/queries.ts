import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys, getDraft, getPublicState } from "./api";

export function useDraftQuery() {
  return useQuery({
    queryKey: adminQueryKeys.draft,
    queryFn: ({ signal }) => getDraft(signal),
    retry: false,
  });
}

export function usePublicStateQuery() {
  return useQuery({
    queryKey: adminQueryKeys.publicState,
    queryFn: ({ signal }) => getPublicState(signal),
    retry: false,
  });
}
