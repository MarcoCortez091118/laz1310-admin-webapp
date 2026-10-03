import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listMedia,
  type MediaAssetId,
  mediaQueryKeys,
  uploadMedia,
} from "./api";

export function useMediaLibraryQuery(limit = 24) {
  return useInfiniteQuery({
    queryKey: mediaQueryKeys.list(limit),
    queryFn: ({ pageParam, signal }) => listMedia(limit, pageParam, signal),
    initialPageParam: null as MediaAssetId | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < limit) return undefined;
      return lastPage.data.at(-1)?.id ?? undefined;
    },
    retry: false,
  });
}

export function useUploadMediaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, alt, assetId }: { file: File; alt: string; assetId: MediaAssetId }) =>
      uploadMedia(file, alt, assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all }),
  });
}
