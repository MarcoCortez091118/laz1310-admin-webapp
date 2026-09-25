import { describe, expect, it } from "vitest";
import {
  createBlock,
  moveBlock,
  removeBlock,
  replaceBlock,
} from "./pageBuilderModel";

describe("Page Builder model", () => {
  it("creates a Cards block with the backend minimum of one card", () => {
    const block = createBlock("cards");
    expect(block.type).toBe("cards");
    if (block.type !== "cards") {
      throw new Error("Unexpected block type");
    }
    expect(block.items).toHaveLength(1);
    expect(block.items[0]?.title).toBe("New card");
  });

  it("requires a station for station-backed blocks", () => {
    expect(() => createBlock("radio_player")).toThrow(/station/i);
    expect(() => createBlock("show_list")).toThrow(/station/i);
  });

  it("moves blocks without mutating the source array", () => {
    const first = createBlock("hero");
    const second = createBlock("text");
    const source = [first, second];

    const moved = moveBlock(source, 1, -1);

    expect(moved).not.toBe(source);
    expect(moved[0]).toBe(second);
    expect(source[0]).toBe(first);
  });

  it("keeps the same array when a move is outside the valid range", () => {
    const source = [createBlock("text")];
    expect(moveBlock(source, 0, -1)).toBe(source);
  });

  it("removes and replaces blocks by index", () => {
    const first = createBlock("hero");
    const second = createBlock("text");
    const third = createBlock("cards");

    expect(removeBlock([first, second], 0)).toEqual([second]);
    expect(replaceBlock([first, second], 1, third)).toEqual([first, third]);
  });
});
