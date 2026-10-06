import { useQuery } from "@tanstack/react-query";
import {
  getProgramPublicationStatus,
  getProgramTrash,
  getPublishedProgramsOutsideDraft,
  programsQueryKeys,
} from "./api";

export function useProgramPublicationStatusQuery() {
  return useQuery({
    queryKey: programsQueryKeys.status,
    queryFn: ({ signal }) => getProgramPublicationStatus(signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useProgramTrashQuery(enabled = true) {
  return useQuery({
    queryKey: programsQueryKeys.trash,
    queryFn: ({ signal }) => getProgramTrash(100, undefined, signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePublishedProgramsOutsideDraftQuery(enabled = true) {
  return useQuery({
    queryKey: programsQueryKeys.publishedOutsideDraft,
    queryFn: ({ signal }) => getPublishedProgramsOutsideDraft(signal),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
