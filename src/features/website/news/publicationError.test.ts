import { describe, expect, it } from "vitest";
import { ApiError } from "../../../api/errors";
import { websitePublicationErrorMessage } from "./publicationError";

describe("Website publishing failure messages", () => {
  it("preserves the exact actionable 409 reason from FastAPI", () => {
    const conflict = new ApiError(
      "Legacy article baseline missing; reconcile before publish", 409, "conflict",
    );
    const message = websitePublicationErrorMessage(conflict);
    expect(message).toContain("Legacy article baseline missing");
    expect(message).toContain("409");
  });

  it("does not mistake an expired identity for a data conflict", () => {
    const unauthorized = new ApiError("Expired ID token", 401, "unauthenticated");
    expect(websitePublicationErrorMessage(unauthorized)).toContain("authorization");
    expect(websitePublicationErrorMessage(unauthorized)).toContain("401");
  });

  it("keeps API network failures distinct", () => {
    expect(websitePublicationErrorMessage(new Error("Network unavailable")))
      .toBe("Network unavailable");
  });
});
