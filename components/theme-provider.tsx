"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export function ThemeSync() {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [hasMounted, setHasMounted] = useState(false);
  const syncedRef = React.useRef(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !user?.id || syncedRef.current) return;

    // Check if user has a theme saved in localStorage (from previous manual selection)
    const localStorageTheme = localStorage.getItem("theme");

    if (!localStorageTheme && user.theme_preferences?.mode) {
      // Only apply backend preference if no local theme exists (first visit or cleared storage)
      const backendTheme = user.theme_preferences.mode as
        | "dark"
        | "light"
        | "system";
      setTheme(backendTheme);
    }

    syncedRef.current = true;
  }, [hasMounted, user?.id, user?.theme_preferences?.mode, setTheme]);

  return null;
}
