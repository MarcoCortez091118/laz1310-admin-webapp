import { describe, expect, it } from "vitest";
import { apiErrorKind } from "./errors";

describe("apiErrorKind", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [409, "conflict"],
    [413, "payload-too-large"],
    [422, "validation"],
    [429, "rate-limited"],
    [503, "unavailable"],
    [500, "unexpected"],
  ] as const)("maps %s to %s", (status, expected) => {
    expect(apiErrorKind(status)).toBe(expected);
  });
});
