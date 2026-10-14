import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppearanceContext, readAppearance, saveAppearance } from "./appearance";
import { createAdminTheme } from "./theme";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: false,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );
  const [mode, setMode] = useState(readAppearance);
  const theme = useMemo(() => createAdminTheme(mode), [mode]);
  const toggle = useCallback(() => setMode(current => current === "dark" ? "light" : "dark"), []);

  useEffect(() => {
    saveAppearance(mode);
    document.documentElement.dataset.adminAppearance = mode;
    return () => {
      delete document.documentElement.dataset.adminAppearance;
    };
  }, [mode]);

  const appearance = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return (
    <AppearanceContext.Provider value={appearance}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}
