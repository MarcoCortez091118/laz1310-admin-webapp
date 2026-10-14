import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPEARANCE_KEY, parseAppearance, readAppearance, saveAppearance,
} from "./appearance";
import { createAdminTheme } from "./theme";

afterEach(() => vi.unstubAllGlobals());

describe("admin appearance accessibility and persistence", () => {
  it("defaults to dark and rejects unknown stored settings", () => {
    expect(parseAppearance(null)).toBe("dark");
    expect(parseAppearance(undefined)).toBe("dark");
    expect(parseAppearance("system")).toBe("dark");
    expect(parseAppearance("bogus")).toBe("dark");
    expect(parseAppearance("dark")).toBe("dark");
    expect(parseAppearance("light")).toBe("light");
  });

  it("loads a valid preference and persists only the selected mode", () => {
    const getItem = vi.fn().mockReturnValue("light");
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { getItem, setItem } });
    expect(readAppearance()).toBe("light");
    expect(getItem).toHaveBeenCalledWith(APPEARANCE_KEY);
    saveAppearance("dark");
    expect(setItem).toHaveBeenCalledWith(APPEARANCE_KEY, "dark");
  });

  it("never blocks rendering or editing when browser storage is unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new Error("blocked"); },
        setItem: () => { throw new Error("blocked"); },
      },
    });
    expect(readAppearance()).toBe("dark");
    expect(() => saveAppearance("light")).not.toThrow();
  });

  it("shares semantic component colors between dashboards, tables and dialogs", () => {
    const dark = createAdminTheme("dark");
    const light = createAdminTheme("light");
    expect(dark.palette.mode).toBe("dark");
    expect(light.palette.mode).toBe("light");
    expect(dark.palette.background.default).not.toBe(light.palette.background.default);
    expect(dark.palette.background.paper).not.toBe(light.palette.background.paper);
    expect(dark.palette.text.primary).not.toBe(light.palette.text.primary);
    expect(dark.shape.borderRadius).toBe(14);
    expect(light.shape.borderRadius).toBe(14);
  });
});
