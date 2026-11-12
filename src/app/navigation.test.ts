import { describe, expect, it } from "vitest";
import {
  canOpenPath,
  visibleNavigationGroups,
  workspaceDashboard,
  workspaceFromPath,
  workspaceNavigation,
} from "./navigation";

function allPaths(scope: "website" | "app", admin = true, query = "") {
  return visibleNavigationGroups(scope, admin, query)
    .flatMap(group => group.items.map(item => item.to));
}

describe("platform workspace navigation", () => {
  it("derives the selected workspace from the current URL and copied deep links", () => {
    expect(workspaceFromPath("/")).toBe("app");
    expect(workspaceFromPath("/programs")).toBe("app");
    expect(workspaceFromPath("/notifications")).toBe("app");
    expect(workspaceFromPath("/website")).toBe("website");
    expect(workspaceFromPath("/website/")).toBe("website");
    expect(workspaceFromPath("/website/news")).toBe("website");
    expect(workspaceFromPath("/website/campaigns")).toBe("website");
    expect(workspaceFromPath("/website/ticket-promotions")).toBe("website");
    expect(workspaceFromPath("/website/media")).toBe("website");
    expect(workspaceFromPath("/website-extra")).toBe("app");
  });

  it("selects an independent dashboard without remapping existing routes", () => {
    expect(workspaceDashboard("website")).toBe("/website");
    expect(workspaceDashboard("app")).toBe("/");
    expect(allPaths("website")).toContain("/website");
    expect(allPaths("app")).toContain("/");
  });

  it("never mixes Website editorial menus with App Android/iOS menus", () => {
    const website = allPaths("website");
    const app = allPaths("app");
    expect(website).toEqual([
      "/website", "/website/news", "/website/campaigns",
      "/website/shows", "/website/media",
    ]);
    expect(website.every(path => workspaceFromPath(path) === "website")).toBe(true);
    expect(app.every(path => workspaceFromPath(path) === "app")).toBe(true);
    expect(new Set(website).size).toBe(website.length);
    expect(new Set(app).size).toBe(app.length);
    expect(app).not.toContain("/website/news");
    expect(website).not.toContain("/programs");
    expect(website).not.toContain("/dynamics");
  });

  it("applies the existing adminOnly rule within each selected platform", () => {
    const editorPaths = allPaths("app", false);
    for (const restricted of ["/users", "/releases", "/audit", "/branding", "/configuration", "/staff"]) {
      expect(editorPaths).not.toContain(restricted);
      expect(allPaths("app", true)).toContain(restricted);
    }
    expect(allPaths("website", false)).toEqual(allPaths("website", true));
  });

  it("searches only the active workspace and hides empty groups", () => {
    expect(allPaths("website", false, "SHOWS")).toEqual(["/website/shows"]);
    expect(allPaths("app", false, "SHOWS")).toEqual([]);
    expect(allPaths("website", true, "programs")).toEqual([]);
    expect(allPaths("app", true, "programs")).toEqual(["/programs"]);
    expect(visibleNavigationGroups("website", true, "not a route")).toEqual([]);
  });

  it("preserves the configured taxonomy without mutating it when searching", () => {
    const before = workspaceNavigation.app.map(group => group.items.length);
    visibleNavigationGroups("app", false, "radio");
    const after = workspaceNavigation.app.map(group => group.items.length);
    expect(after).toEqual(before);
  });
});

describe("staff per-module permissions", () => {
  it("hides unauthorized items and direct links", () => {
    const grants = { "website.news": ["view"], "app.programs": ["view"] };
    expect(canOpenPath("/website/news", grants, false)).toBe(true);
    expect(canOpenPath("/website/campaigns", grants, false)).toBe(false);
    expect(canOpenPath("/programs", grants, false)).toBe(true);
    expect(canOpenPath("/notifications", grants, false)).toBe(false);
    expect(canOpenPath("/staff", grants, false)).toBe(false);
    expect(visibleNavigationGroups("website", false, "", grants, false).flatMap(g => g.items.map(i => i.to))).toEqual([
      "/website", "/website/news",
    ]);
  });
  it("never delegates owner staff administration via managed admin role", () => {
    const grants = { "app.programs": ["view", "edit"] };
    const paths = visibleNavigationGroups("app", true, "", grants, false).flatMap(g => g.items.map(i => i.to));
    expect(paths).toContain("/programs");
    expect(paths).not.toContain("/staff");
    expect(paths).not.toContain("/users");
  });
});
