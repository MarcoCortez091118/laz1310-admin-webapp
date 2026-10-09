import { useQuery } from "@tanstack/react-query";
import {
  adminQueryKeys,
  getConfigurationPublicationStatus,
  getDraft,
  getPagePublicationStatus,
  getPreview,
  getPublicState,
} from "./api";

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


export function usePagePublicationStatusQuery(slug: string) {
  return useQuery({
    queryKey: adminQueryKeys.pageStatus(slug),
    queryFn: ({ signal }) => getPagePublicationStatus(slug, signal),
    retry: false,
  });
}


export function useConfigurationPublicationStatusQuery() {
  return useQuery({
    queryKey: adminQueryKeys.configurationStatus,
    queryFn: ({ signal }) => getConfigurationPublicationStatus(signal),
    retry: false,
  });
}
