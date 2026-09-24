import { useQuery } from "@tanstack/react-query";
import { adminQueryKeys, getDraft, getPreview, getPublicState } from "./api";

export function useDraftQuery() {
  return useQuery({
    queryKey: adminQueryKeys.draft,
    queryFn: ({ signal }) => getDraft(signal),
    retry: false,
  });
}

export function usePreviewQuery() {
  return useQuery({
    queryKey: adminQueryKeys.preview,
    queryFn: ({ signal }) => getPreview(signal),
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
