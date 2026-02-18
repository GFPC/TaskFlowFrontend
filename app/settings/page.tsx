"use client";

import { useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { users, ApiError } from "@/lib/api";
import { useState } from "react";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const toggleSetting = async (key: string, value: boolean) => {
    setLoading(true);
    try {
      const newSettings = { 
        ...user?.notification_settings,
        [key]: value 
      };
      await users.updateNotifications(newSettings as Record<string, boolean>);
      toast.success("Настройки обновлены");
      refreshUser();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">Управление уведомлениями и интерфейсом</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Выберите, как вы хотите получать уведомления</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Telegram уведомления</Label>
                <p className="text-sm text-muted-foreground">Получать оповещения в бота</p>
              </div>
              <Switch 
                checked={user?.notification_settings?.telegram} 
                onCheckedChange={(v) => toggleSetting('telegram', v)}
                disabled={loading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Новые задачи</Label>
                <p className="text-sm text-muted-foreground">Когда вам назначают задачу</p>
              </div>
              <Switch 
                checked={user?.notification_settings?.task_assigned} 
                onCheckedChange={(v) => toggleSetting('task_assigned', v)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
