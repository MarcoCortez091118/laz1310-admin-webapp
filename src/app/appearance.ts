import { createContext, useContext } from "react";
import type { PaletteMode } from "@mui/material/styles";

export const APPEARANCE_KEY = "laz1310-admin-appearance-v1";

export function parseAppearance(value: string | null | undefined): PaletteMode {
  return value === "light" ? "light" : "dark";
}

export function readAppearance(): PaletteMode {
  try {
    return parseAppearance(window.localStorage.getItem(APPEARANCE_KEY));
  } catch {
    // Private browsing and blocked storage must still render correctly.
    return "dark";
  }
}

export function saveAppearance(mode: PaletteMode): void {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, mode);
  } catch {
    // Appearance never blocks authentication or editorial operations.
  }
}

interface AppearanceValue {
  mode: PaletteMode;
  toggle: () => void;
}

export const AppearanceContext = createContext<AppearanceValue | null>(null);

export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("AppearanceProvider is not mounted");
  return value;
}
