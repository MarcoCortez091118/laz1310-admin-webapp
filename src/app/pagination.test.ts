import { describe, expect, it } from "vitest";
import { pageCount, paginateItems } from "./pagination";

describe("editorial pagination", () => {
  const items = Array.from({ length: 27 }, (_, i) => i + 1);

  it("bounds the initial card grid and visits every record", () => {
    expect(paginateItems(items, 1, 9)).toEqual({
      items: items.slice(0, 9), page: 1, pages: 3, total: 27,
    });
    expect(paginateItems(items, 3, 9).items).toEqual(items.slice(18));
  });
  it("clamps invalid, out-of-range and stale page selection safely", () => {
    expect(paginateItems(items, -1, 9).page).toBe(1);
    expect(paginateItems(items, 99, 9).page).toBe(3);
    expect(paginateItems(items, Number.NaN, 9).page).toBe(1);
    expect(paginateItems(items, 1.8, 9).page).toBe(1);
  });
  it("preserves the empty state as a single logical page", () => {
    expect(paginateItems([], 10, 8)).toEqual({
      items: [], page: 1, pages: 1, total: 0,
    });
    expect(pageCount(0, 8)).toBe(1);
    expect(pageCount(17, 8)).toBe(3);
  });
  it("never mutates the original dataset and rejects invalid sizes", () => {
    const frozen = Object.freeze(items);
    paginateItems(frozen, 1, 9);
    expect(items[0]).toBe(1);
    expect(() => paginateItems(items, 1, 0)).toThrow(RangeError);
    expect(() => paginateItems(items, 1, -5)).toThrow(RangeError);
  });
});
