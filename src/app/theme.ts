import { createTheme, type PaletteMode } from "@mui/material/styles";

/**
 * LA Z Admin design tokens. Dark-first editorial workspace inspired by a modern
 * operations dashboard, with LA Z's own red / near-black brand identity.
 */
export const adminColors = {
  black: "#0B0C0E",
  surface: "#17181B",
  surfaceRaised: "#1D1E22",
  sidebar: "#111215",
  burgundy: "#2F0908",
  red: "#D30A12",
  teal: "#2BC4A4",
  amber: "#F6AD55",
  blue: "#6397F8",
} as const;

export function createAdminTheme(mode: PaletteMode = "dark") {
  const dark = mode === "dark";
  const border = dark ? "#2A2C31" : "#E4E7EC";
  const paper = dark ? adminColors.surface : "#FFFFFF";
  const secondary = dark ? "#A7AAB3" : "#667085";
  return createTheme({
    palette: {
      mode,
      primary: {
        main: dark ? "#F14C52" : adminColors.red,
        dark: "#AB111A",
        light: "#FFA3A6",
        contrastText: "#FFFFFF",
      },
      secondary: { main: dark ? "#A6A8B0" : adminColors.burgundy },
      background: {
        default: dark ? adminColors.black : "#F6F8FB",
        paper,
      },
      text: {
        primary: dark ? "#F5F5F7" : "#151823",
        secondary,
      },
      divider: border,
      success: { main: dark ? "#35CEA5" : "#087F5B" },
      warning: { main: dark ? "#FFBC66" : "#B76B11" },
      error: { main: dark ? "#FF6B72" : "#C02730" },
      info: { main: dark ? "#83B3FF" : "#2563EB" },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h1: { fontWeight: 850, letterSpacing: "-0.04em" },
      h2: { fontWeight: 850, letterSpacing: "-0.04em" },
      h3: { fontWeight: 800, letterSpacing: "-0.035em" },
      h4: { fontWeight: 800, letterSpacing: "-0.035em" },
      h5: { fontWeight: 750, letterSpacing: "-0.025em" },
      h6: { fontWeight: 750, letterSpacing: "-0.02em" },
      button: { fontWeight: 700, textTransform: "none" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { colorScheme: mode },
          body: {
            minWidth: 320, minHeight: "100vh",
            backgroundColor: dark ? adminColors.black : "#F6F8FB",
          },
          "*": { boxSizing: "border-box" },
          "::-webkit-scrollbar": { width: 9, height: 9 },
          "::-webkit-scrollbar-thumb": {
            background: dark ? "#373A40" : "#CFD3DC",
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          outlined: { borderColor: border },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: paper,
            backgroundImage: "none",
            border: `1px solid ${border}`,
            boxShadow: dark ? "0 10px 28px rgba(0,0,0,.12)" : "0 2px 12px rgba(16,24,40,.04)",
            borderRadius: 17,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, minHeight: 38, fontWeight: 700 },
          contained: {
            backgroundColor: dark ? adminColors.red : undefined,
            color: "#FFFFFF",
            "&:hover": { backgroundColor: "#AE0C16" },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 700 },
          outlined: { borderColor: border },
        },
      },
      MuiTextField: { defaultProps: { size: "small" } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: dark ? "#202125" : "#FFFFFF",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: dark ? "#3A3C42" : "#D0D5DD" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: dark ? "#73777F" : "#98A2B3" },
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: { root: { borderRadius: 14 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: border, padding: "13px 16px" },
          head: {
            color: secondary,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 800,
            backgroundColor: dark ? "#1A1B1E" : "#F8FAFC",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover:not(.MuiTableRow-head)": {
              backgroundColor: dark ? "rgba(255,255,255,.035)" : "#FAFBFC",
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            border: `1px solid ${border}`,
            backgroundColor: paper,
            borderRadius: 18,
            boxShadow: "0 28px 80px rgba(0,0,0,.35)",
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: { padding: "22px 24px 14px", fontWeight: 800, letterSpacing: "-.02em" },
        },
      },
      MuiDialogContent: {
        styleOverrides: { root: { borderColor: border, padding: "20px 24px" } },
      },
      MuiDialogActions: {
        styleOverrides: { root: { padding: "16px 24px", gap: 8 } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${border}`, borderRadius: 12, backgroundColor: paper },
        },
      },
      MuiTooltip: { defaultProps: { arrow: true } },
    },
  });
}

/** Backwards-compatible theme export for existing isolated consumers. */
export const adminTheme = createAdminTheme();
