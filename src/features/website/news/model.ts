import type { WebsitePost } from "./api";

export const NEWS_COLUMNS = [
  { id: "category", label: "Category" },
  { id: "date", label: "Date" },
  { id: "source", label: "Source" },
  { id: "slug", label: "Article ID" },
] as const;

export type NewsColumn = (typeof NEWS_COLUMNS)[number]["id"];

export const NEWS_PAGE_SIZES = [10, 20, 50] as const;

export function filterNewsPage(
  posts: WebsitePost[],
  search: string,
  category: string,
): WebsitePost[] {
  const term = search.trim().toLocaleLowerCase();
  return posts.filter((post) => {
    if (category !== "all" && post.category !== category) return false;
    if (!term) return true;
    return [
      post.headline,
      post.summary,
      post.category,
      post.sourceName,
      post.id,
    ].some((field) => field.toLocaleLowerCase().includes(term));
  });
}

export function newsPageCategories(posts: WebsitePost[]): string[] {
  return [...new Set(posts.map((post) => post.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

/** The API uses opaque forward cursors and exposes no total count. */
export function canAdvanceNewsPage(
  pageIndex: number,
  cachedPages: number,
  hasNextCursor: boolean,
): boolean {
  return pageIndex + 1 < cachedPages || hasNextCursor;
}

export function displayNewsDate(post: WebsitePost): string {
  const timestampMs = post.timestamp < 10_000_000_000
    ? post.timestamp * 1000
    : post.timestamp;
  const date = new Date(timestampMs);
  return post.date || (Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString());
}
