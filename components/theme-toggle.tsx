"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

import { Moon, Sun } from "lucide-react";

import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { users } from "@/lib/api";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const saveTheme = async (mode: "dark" | "light" | "system") => {
    try {
      await users.updateTheme({ mode });
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
    setTheme(newTheme);
    if (user) {
      saveTheme(newTheme);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-full justify-start gap-3"
      onClick={cycleTheme}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
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
