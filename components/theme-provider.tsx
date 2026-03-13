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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || !user?.theme_preferences?.mode) return;
    // Always sync theme from backend preferences
    const backendTheme = user.theme_preferences.mode as
      | "dark"
      | "light"
      | "system";
    setTheme(backendTheme);
  }, [hasMounted, user?.theme_preferences?.mode, setTheme]);

  return null;
}
