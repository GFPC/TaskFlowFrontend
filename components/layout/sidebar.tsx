"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  User,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

import { useState, useEffect } from "react";

const navigation = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { name: "Команды", href: "/teams", icon: Users },
  { name: "Проекты", href: "/projects", icon: FolderKanban },
  { name: "Профиль", href: "/profile", icon: User },
  { name: "Настройки", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border/60 bg-card/90 shadow-sm backdrop-blur-xl transition-transform dark:bg-card/80 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full px-4 py-6">
          <div className="flex items-center gap-2.5 px-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-sm text-primary-foreground shadow-md ring-2 ring-primary/25">
              TF
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">
                TaskFlow
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Задачи и команды
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground",
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="pt-4 border-t space-y-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2.5 h-auto font-medium text-muted-foreground hover:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Выйти
            </Button>
          </div>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
