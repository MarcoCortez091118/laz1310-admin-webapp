import { describe, expect, it } from "vitest";
import {
  contentBytes,
  defaultCampaignInput,
  isSupportedTarget,
  validateCampaignInput,
} from "./model";

describe("notifications model", () => {
  it("accepts the closed Notifications V1 route allowlist", () => {
    expect(isSupportedTarget("/home")).toBe(true);
    expect(isSupportedTarget("/radio")).toBe(true);
    expect(isSupportedTarget("/dynamics")).toBe(true);
    expect(isSupportedTarget("/dynamics/88a17268-ce3e-42ea-bf3c-5c8eed7d1d6f")).toBe(true);
    expect(isSupportedTarget("https://example.com")).toBe(false);
    expect(isSupportedTarget("/news")).toBe(false);
  });

  it("requires a real internal User UUID for user targeting", () => {
    const input = {
      ...defaultCampaignInput(),
      title: "LA Z",
      body: "Prueba",
      audience: { type: "user" as const, userId: "firebase-uid" },
    };
    expect(validateCampaignInput(input)).toContain("internal User UUID");
  });

  it("rejects markup and control characters", () => {
    expect(validateCampaignInput({ ...defaultCampaignInput(), title: "<b>LA Z</b>", body: "Prueba" })).toContain("plain text");
    expect(validateCampaignInput({ ...defaultCampaignInput(), title: "LA Z", body: "linea\n2" })).toContain("plain text");
  });

  it("tracks the UTF-8 content budget", () => {
    const input = { ...defaultCampaignInput(), title: "LA Z", body: "🎙️".repeat(600) };
    expect(contentBytes(input)).toBeGreaterThan(2500);
    expect(validateCampaignInput(input)).toBeTruthy();
  });
});
