import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import { reconcileWebsiteLegacy, reviewWebsiteLegacy } from "./legacyReconciliationApi";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website imported legacy article reconciliation API", () => {
  it("retrieves both versions for an explicit administrator comparison", () => {
    reviewWebsiteLegacy("zacarias-ferreira-llega-para-hacer-bailar-a-detroit-m3m2");
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/zacarias-ferreira-llega-para-hacer-bailar-a-detroit-m3m2/draft/legacy-review",
      { method: "GET" },
    );
  });

  it("requires both the exact reviewed legacy fingerprint and If-Match revision", () => {
    const fingerprint = "a".repeat(64);
    reconcileWebsiteLegacy("legacy-article", 3, fingerprint);
    expect(apiRequest).toHaveBeenLastCalledWith(
      "/api/v1/admin/website/posts/legacy-article/draft/reconcile-legacy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyFingerprint: fingerprint }),
      },
      { ifMatch: '"3"' },
    );
  });
});
