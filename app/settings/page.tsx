"use client";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";

import { AppShell } from "@/components/layout/app-shell";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { users, formatApiError } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();

  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const toggleSetting = async (key: string, value: boolean) => {
    setLoading(true);
    try {
      const newSettings = {
        ...user?.notification_settings,

        [key]: value,
      };
      await users.updateNotifications(newSettings as Record<string, boolean>);
      toast.success("Настройки обновлены");
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (mode: "dark" | "light" | "system") => {
    setLoading(true);
    try {
      await users.updateTheme({ mode });
      toast.success("Тема обновлена");
      refreshUser();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">
            Управление уведомлениями и интерфейсом
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>
              Выберите, как вы хотите получать уведомления
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Уведомления на email</Label>
                <p className="text-sm text-muted-foreground">
                  Письма о событиях в TaskFlow
                </p>
              </div>
              <Switch
                checked={!!user?.notification_settings?.email}
                onCheckedChange={(v) => toggleSetting("email", v)}
                disabled={loading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Новые задачи</Label>
                <p className="text-sm text-muted-foreground">
                  Когда вам назначают задачу
                </p>
              </div>
              <Switch
                checked={!!user?.notification_settings?.task_assigned}
                onCheckedChange={(v) => toggleSetting("task_assigned", v)}
                disabled={loading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Завершение задач</Label>
                <p className="text-sm text-muted-foreground">
                  Когда задача переведена в «Выполнена»
                </p>
              </div>
              <Switch
                checked={!!user?.notification_settings?.task_completed}
                onCheckedChange={(v) => toggleSetting("task_completed", v)}
                disabled={loading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Готовность зависимости</Label>
                <p className="text-sm text-muted-foreground">
                  Когда связанная задача стала доступна к работе
                </p>
              </div>
              <Switch
                checked={!!user?.notification_settings?.dependency_ready}
                onCheckedChange={(v) => toggleSetting("dependency_ready", v)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Внешний вид</CardTitle>
            <CardDescription>Настройте тему интерфейса</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Тема</Label>
                <p className="text-sm text-muted-foreground">
                  Выберите тему интерфейса
                </p>
              </div>

              <Select
                value={theme || "system"}
                onValueChange={(value) =>
                  updateTheme(value as "dark" | "light" | "system")
                }
                disabled={loading}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Тема" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Светлая</SelectItem>
                  <SelectItem value="dark">Тёмная</SelectItem>
                  <SelectItem value="system">Системная</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
