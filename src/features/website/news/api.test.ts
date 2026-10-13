import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import { listWebsitePosts } from "./api";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website News V1 admin contract", () => {
  it("queries only the website namespace with an opaque cursor", () => {
    listWebsitePosts(12, "test-cursor");
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/v1/admin/website/posts?limit=12&after=test-cursor",
      { method: "GET" },
      { signal: undefined },
    );
  });

  it("never requests Mobile admin pages", () => {
    listWebsitePosts();
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts?limit=20",
      { method: "GET" },
      { signal: undefined },
    );
  });
});
