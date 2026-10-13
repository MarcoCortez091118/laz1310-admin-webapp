import { describe, expect, it } from "vitest";
import type { Card } from "../../api/types";
import { bannerDraftError, stageBanner } from "./bannerDraft";

const example: Card = { title: "Concert", imageUrl: "https://media.example.com/art.webp", link: null };

describe("banner staging", () => {
  it("rejects missing title or artwork before applying a local draft", () => {
    expect(bannerDraftError({ ...example, title: " " })).toMatch(/title/);
    expect(bannerDraftError({ ...example, imageUrl: null })).toMatch(/managed image/);
    expect(bannerDraftError({ ...example, link: { kind: "external", target: "http://unsafe.test" } })).toMatch(/https/);
    expect(bannerDraftError(example)).toBeNull();
  });

  it("adds a card without mutating the original list", () => {
    const before = [example];
    const second = { ...example, title: "Tickets" };
    expect(stageBanner(before, { index: null, banner: second })).toEqual([example, second]);
    expect(before).toHaveLength(1);
  });

  it("edits exactly one card without modifying its siblings", () => {
    const second = { ...example, title: "Tickets" };
    const changed = { ...example, title: "Updated" };
    const before = [example, second];
    expect(stageBanner(before, { index: 0, banner: changed })).toEqual([changed, second]);
    expect(before[0].title).toBe("Concert");
  });
});
