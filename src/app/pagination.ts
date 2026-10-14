/** Shared pure client-side pagination for already fetched CMS result pages. */
export function pageCount(total: number, pageSize: number): number {
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new RangeError("Page size must be positive");
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

export function paginateItems<T>(
  items: readonly T[], page: number, pageSize: number,
): { items: T[]; page: number; pages: number; total: number } {
  const pages = pageCount(items.length, pageSize);
  const normalized = Number.isFinite(page) ? Math.floor(page) : 1;
  const selected = Math.max(1, Math.min(pages, normalized));
  return {
    items: items.slice((selected - 1) * pageSize, selected * pageSize),
    page: selected,
    pages,
    total: items.length,
  };
}
