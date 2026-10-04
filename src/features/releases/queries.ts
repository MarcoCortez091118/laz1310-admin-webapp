import { useInfiniteQuery } from "@tanstack/react-query";
import { getReleases } from "./api";

export const releaseQueryKeys = {
  all: ["admin", "releases"] as const,
};

export function useReleasesQuery() {
  return useInfiniteQuery({
    queryKey: releaseQueryKeys.all,
    queryFn: ({ pageParam, signal }) => getReleases(20, pageParam || undefined, signal),
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < 20) return undefined;
      return lastPage.data.at(-1)?.id;
    },
    retry: false,
  });
}
