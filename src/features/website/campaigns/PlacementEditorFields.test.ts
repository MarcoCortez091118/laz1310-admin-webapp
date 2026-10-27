import { describe, expect, it, vi } from "vitest";
import { apiRequest } from "../../../api/client";
import { websiteScheduleValid } from "./PlacementEditorFields";
import {
  getPopupDraft, getPopupLegacy, getPopupPublication, getPopupReleases,
  importPopupLegacy, publishPopup, rollbackPopup, savePopupDraft,
  type PopupContent,
} from "./popupApi";

vi.mock("../../../api/client", () => ({ apiRequest: vi.fn() }));

describe("Website Pop Up and placement contracts", () => {
  it("validates dates and locations without changing Firebase schema", () => {
    expect(websiteScheduleValid({})).toBe(true);
    expect(websiteScheduleValid({ placements: [] })).toBe(false);
    expect(websiteScheduleValid({ placements: ["home", "home"] })).toBe(false);
    expect(websiteScheduleValid({ placements: ["actividades"] })).toBe(true);
    expect(websiteScheduleValid({ startsAt: "2026-10-27T00:00:00Z" })).toBe(false);
    expect(websiteScheduleValid({
      startsAt: "2026-10-28T00:00:00Z",
      endsAt: "2026-10-27T00:00:00Z",
    })).toBe(false);
    expect(websiteScheduleValid({
      startsAt: "2026-10-27T00:00:00Z",
      endsAt: "2026-10-28T00:00:00Z",
      placements: ["home", "programacion"],
    })).toBe(true);
  });

  it("only reads Website-controlled snapshots", () => {
    getPopupLegacy(); getPopupDraft(); getPopupPublication(); getPopupReleases();
    expect(vi.mocked(apiRequest).mock.calls.slice(-4).map(call => call[0])).toEqual([
      "/api/v1/admin/website/popup/legacy",
      "/api/v1/admin/website/popup/draft",
      "/api/v1/admin/website/popup/publication",
      "/api/v1/admin/website/popup/releases?limit=25",
    ]);
  });

  it("uses CAS revisions for every mutating Popup action", () => {
    const content: PopupContent = {
      enabled: true, delay: 3,
      images: [{ url: "https://example.com/ad.png", link: "" }],
      placements: ["home", "actividades"], startsAt: null, endsAt: null,
      timezone: "America/Detroit",
    };
    importPopupLegacy("0".repeat(64));
    savePopupDraft(content, 5);
    publishPopup(6);
    rollbackPopup(7, "0c290fc2-8432-42c8-a826-3a4f101af5a5");
    const calls = vi.mocked(apiRequest).mock.calls.slice(-4);
    expect(calls.map(call => call[0])).toEqual([
      "/api/v1/admin/website/popup/draft/import",
      "/api/v1/admin/website/popup/draft",
      "/api/v1/admin/website/popup/publish",
      "/api/v1/admin/website/popup/rollback",
    ]);
    expect(calls.map(call => call[2])).toEqual([
      { ifMatch: '"0"' }, { ifMatch: '"5"' },
      { ifMatch: '"6"' }, { ifMatch: '"7"' },
    ]);
    expect(calls[1][1]?.body).toContain('"placements":["home","actividades"]');
  });
});
