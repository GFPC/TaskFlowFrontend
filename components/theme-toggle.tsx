"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

import { Moon, Sun } from "lucide-react";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { users } from "@/lib/api";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const { user, refreshUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        disabled
        className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-muted-foreground"
      >
        <Sun className="h-4 w-4 shrink-0" />
        <span className="text-sm">Тема</span>
      </Button>
    );
  }

  const saveTheme = async (mode: "dark" | "light" | "system") => {
    try {
      await users.updateTheme({ mode });
      // Refresh user data to update theme_preferences in auth context
      refreshUser();
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  const cycleTheme = () => {
    let newTheme: "dark" | "light" | "system";

    if (theme === "dark") {
      newTheme = "light";
    } else if (theme === "light") {
      newTheme = "system";
    } else {
      newTheme = "dark";
    }
    if (user) {
      saveTheme(newTheme);
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-3 px-3 py-2.5 h-auto font-medium text-muted-foreground hover:text-foreground"
      onClick={cycleTheme}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 shrink-0" />
      ) : theme === "light" ? (
        <Moon className="h-4 w-4 shrink-0" />
      ) : (
        <Sun className="h-4 w-4 shrink-0" />
      )}
      <span className="text-sm">
        {theme === "dark"
          ? "Тёмная"
          : theme === "light"
            ? "Светлая"
            : "Системная"}
      </span>
    </Button>
  );
}
