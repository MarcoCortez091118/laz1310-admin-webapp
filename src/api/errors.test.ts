import { describe, expect, it } from "vitest";
import { apiErrorKind, toApiError } from "./errors";

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

describe("toApiError", () => {
  it("classifies Firebase App Check 401 responses separately", async () => {
    const response = new Response(
      JSON.stringify({ detail: "Missing Firebase App Check token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );

    const error = await toApiError(response);

    expect(error.kind).toBe("app-check");
    expect(error.message).toBe("Missing Firebase App Check token");
  });
});
