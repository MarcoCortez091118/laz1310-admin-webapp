import { describe, expect, it } from "vitest";
import {
  configureAppCheckForHost,
  isApprovedAppCheckDebugHost,
  resolveAppCheckMode,
  type AppCheckDebugTarget,
} from "./app-check-mode";

describe("App Check deployment mode", () => {
  it("requires Enterprise attestation on hosted AI Studio deployments", () => {
    expect(isApprovedAppCheckDebugHost("laz1310-adminwebapp.ai.studio")).toBe(false);
    expect(resolveAppCheckMode("laz1310-adminwebapp.ai.studio")).toBe("enterprise");
  });

  it("uses debug attestation for localhost development", () => {
    expect(resolveAppCheckMode("localhost")).toBe("debug");
    expect(resolveAppCheckMode("127.0.0.1")).toBe("debug");
  });

  it("uses Enterprise attestation for production and arbitrary hosts", () => {
    expect(resolveAppCheckMode("admin.laz1310.com")).toBe("enterprise");
    expect(resolveAppCheckMode("example.ai.studio")).toBe("enterprise");
  });

  it("enables Firebase debug token generation on localhost only", () => {
    const target: AppCheckDebugTarget = {};

    expect(
      configureAppCheckForHost("localhost", target),
    ).toBe("debug");
    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
  });

  it("does not expose debug attestation on production hosts", () => {
    const target: AppCheckDebugTarget = {};

    expect(configureAppCheckForHost("admin.laz1310.com", target)).toBe(
      "enterprise",
    );
    expect(configureAppCheckForHost("laz1310-adminwebapp.ai.studio", target)).toBe("enterprise");
    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });
});
