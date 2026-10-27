import { describe, expect, it, vi } from "vitest";
import {
  campaignCsvFilename, campaignRegistrationsCsv, collectCampaignRegistrations, csvSafe,
} from "./registrations";

describe("campaign registration exports", () => {
  it("neutralizes CSV spreadsheet formulas and escapes custom answers", () => {
    expect(csvSafe("=2+2")).toBe('"\'=2+2"');
    expect(csvSafe(" \t+cmd")).toBe('"\' \t+cmd"');
    expect(csvSafe('a,b"c')).toBe('"a,b""c"');
    const csv = campaignRegistrationsCsv([{
      id: "r1", dynamicId: "d1", submittedAt: "2026-10-27T12:00:00Z",
      releaseId: "v1", acceptedReleaseId: "v1",
      authenticated: false, values: { custom_field: "=IMPORTXML(A1)" },
      consent: { version: "v1" },
    } as never]);
    expect(csv).toContain("custom_field");
    expect(csv).toContain("'=IMPORTXML(A1)");
  });

  it("reads every available page before returning a complete export", async () => {
    const fetch = vi.fn().mockResolvedValueOnce({
      items: [{ id: "one" }], nextCursor: "next",
    }).mockResolvedValueOnce({ items: [{ id: "two" }], nextCursor: null });
    expect(await collectCampaignRegistrations("campaign", fetch)).toHaveLength(2);
    expect(fetch.mock.calls[1]).toEqual(["campaign", 100, "next"]);
  });

  it("fails closed on broken cursors", async () => {
    const fetch = vi.fn().mockResolvedValue({ items: [], nextCursor: "repeat" });
    await expect(collectCampaignRegistrations("campaign", fetch)).rejects.toThrow("Cursor");
  });

  it("cancels rather than return a partial oversized CSV", async () => {
    const fetch = vi.fn().mockImplementation(async (_id, _limit, cursor) => ({
      items: [{ id: "some" }], nextCursor: String(Number(cursor ?? "0") + 1),
    }));
    await expect(collectCampaignRegistrations("campaign", fetch)).rejects.toThrow("500");
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("sanitizes filenames", () => {
    expect(campaignCsvFilename("Halloween 2026!")).toBe(
      "laz1310-premios-halloween-2026--retained.csv",
    );
  });
});
