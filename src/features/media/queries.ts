import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMedia, mediaQueryKeys, uploadMedia } from "./api";

export function useMediaLibraryQuery(limit = 24) {
  return useInfiniteQuery({
    queryKey: mediaQueryKeys.list(limit),
    queryFn: ({ pageParam, signal }) => listMedia(limit, pageParam, signal),
    initialPageParam: null as string | null,
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
    mutationFn: ({ file, alt }: { file: File; alt: string }) => uploadMedia(file, alt),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mediaQueryKeys.all }),
  });
}
