import { describe, expect, it } from "vitest";
import {
  configureAppCheckDebugMode,
  isApprovedAppCheckDebugHost,
  type AppCheckDebugTarget,
} from "./app-check-mode";

describe("App Check debug mode", () => {
  it("allows the dedicated AI Studio test deployment", () => {
    expect(isApprovedAppCheckDebugHost("laz1310-adminwebapp.ai.studio")).toBe(true);
  });

  it("allows localhost development", () => {
    expect(isApprovedAppCheckDebugHost("localhost")).toBe(true);
    expect(isApprovedAppCheckDebugHost("127.0.0.1")).toBe(true);
  });

  it("rejects production and arbitrary hosts", () => {
    expect(isApprovedAppCheckDebugHost("admin.laz1310.com")).toBe(false);
    expect(isApprovedAppCheckDebugHost("example.ai.studio")).toBe(false);
  });

  it("enables Firebase debug token generation only on approved hosts", () => {
    const target: AppCheckDebugTarget = {};

    configureAppCheckDebugMode(
      "debug",
      "laz1310-adminwebapp.ai.studio",
      target,
    );

    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe(true);
  });

  it("fails closed when debug mode is requested on another host", () => {
    const target: AppCheckDebugTarget = {};

    expect(() =>
      configureAppCheckDebugMode("debug", "admin.laz1310.com", target),
    ).toThrow(/restricted to approved non-production hosts/i);
    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });

  it("does not mutate the runtime in enterprise mode", () => {
    const target: AppCheckDebugTarget = {};

    configureAppCheckDebugMode("enterprise", "admin.laz1310.com", target);

    expect(target.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();
  });
});
