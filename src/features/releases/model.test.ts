import { describe, expect, it } from "vitest";
import type { Draft, PublicState } from "../../api/types";
import { parseReleaseHistory, publicationStatus } from "./model";

const draft = { revision: 7 } as Draft;
const state = { revision: 3, releaseId: "11111111-1111-4111-8111-111111111111" } as PublicState;

const releases = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    sourceRevision: 7,
    publishedAt: "2026-10-03T20:00:00Z",
    publishedBy: "admin-uid",
    note: "Programs update",
  },
];

describe("release model", () => {
  it("parses backend history documents defensively", () => {
    expect(parseReleaseHistory(releases)).toEqual(releases);
  });

  it("rejects malformed history documents", () => {
    expect(() => parseReleaseHistory([{ id: "bad" }])).toThrow("Invalid release history entry.");
  });

  it("detects when Draft matches the active immutable release", () => {
    expect(publicationStatus(draft, state, releases)).toBe("current");
  });

  it("detects unpublished changes after the active release", () => {
    expect(publicationStatus({ ...draft, revision: 8 }, state, releases)).toBe("changes");
  });

  it("distinguishes a platform with no published release", () => {
    expect(publicationStatus(draft, { ...state, releaseId: null }, releases)).toBe("unpublished");
  });

  it("returns unknown when history has not loaded the active release", () => {
    expect(publicationStatus(draft, state, [])).toBe("unknown");
  });
});
