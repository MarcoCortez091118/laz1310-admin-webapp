import type { PageBlock } from "../../api/types";

export type BlockKind =
  | "hero"
  | "text"
  | "radio_player"
  | "show_list"
  | "cards";

export function createBlock(kind: BlockKind, stationId?: string): PageBlock {
  const id = crypto.randomUUID();

  switch (kind) {
    case "hero":
      return {
        type: "hero",
        id,
        title: "New hero",
        subtitle: null,
        imageUrl: null,
        link: null,
      };
    case "text":
      return {
        type: "text",
        id,
        text: "New text block",
      };
    case "radio_player":
      if (!stationId) {
        throw new Error("A station is required to add a radio player.");
      }
      return {
        type: "radio_player",
        id,
        stationId,
      };
    case "show_list":
      if (!stationId) {
        throw new Error("A station is required to add a show list.");
      }
      return {
        type: "show_list",
        id,
        stationId,
      };
    case "cards":
      return {
        type: "cards",
        id,
        items: [{ title: "New card", imageUrl: null, link: null }],
      };
  }
}

export function moveBlock(
  blocks: PageBlock[],
  index: number,
  direction: -1 | 1,
): PageBlock[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= blocks.length || nextIndex < 0 || nextIndex >= blocks.length) {
    return blocks;
  }

  const next = [...blocks];
  const [block] = next.splice(index, 1);
  next.splice(nextIndex, 0, block);
  return next;
}

export function removeBlock(blocks: PageBlock[], index: number): PageBlock[] {
  return blocks.filter((_, current) => current !== index);
}

export function replaceBlock(
  blocks: PageBlock[],
  index: number,
  block: PageBlock,
): PageBlock[] {
  return blocks.map((current, currentIndex) => (currentIndex === index ? block : current));
}

export function blockName(block: PageBlock): string {
  switch (block.type) {
    case "hero":
      return "Hero";
    case "text":
      return "Text";
    case "radio_player":
      return "Radio Player";
    case "show_list":
      return "Show List";
    case "cards":
      return "Cards";
    default:
      return "Block";
  }
}
