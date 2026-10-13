import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../api/client";
import { getUserParticipationHistory } from "./api";

vi.mock("../../api/client", () => ({ apiRequest: vi.fn() }));

describe("account participation history URL", () => {
  it("queries the user-centric endpoint with cursor", () => {
    getUserParticipationHistory("abc", 10, "cursor");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/users/abc/participations?limit=10&after=cursor",
      { method: "GET" },
      { signal: undefined },
    );
  });
});
