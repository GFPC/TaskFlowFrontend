"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { users, auth, type Session } from "@/lib/api";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  User,
  Key,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  LogOut,
  Shield,
  CheckCircle,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [saving, setSaving] = useState(false);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [deletingSession, setDeletingSession] = useState<number | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const {
    data: sessions,
    isLoading: sessionsLoading,
    mutate: mutateSessions,
  } = useSWR<Session[]>("sessions", () => users.sessions());

  async function handleUpdateProfile() {
    setSaving(true);
    try {
      await users.updateMe({ first_name: firstName, last_name: lastName });
      toast.success("Профиль обновлён");
      refreshUser();
    } catch {
      toast.error("Ошибка обновления профиля");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (newPass !== confirmPass) return toast.error("Пароли не совпадают");
    if (newPass.length < 8) return toast.error("Минимум 8 символов");
    setChangingPass(true);
    try {
      await users.changePassword({
        current_password: oldPass,
        new_password: newPass,
      });
      toast.success("Пароль изменён");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch {
      toast.error("Ошибка смены пароля");
    } finally {
      setChangingPass(false);
    }
  }

  async function handleDeleteSession(sessionId: number) {
    setDeletingSession(sessionId);
    try {
      await users.deleteSession(sessionId);
      mutateSessions(
        (sessions) => sessions?.filter((s) => s.id !== sessionId),
        false
      );
      toast.success("Сессия завершена");
    } catch {
      toast.error("Ошибка завершения сессии");
    } finally {
      setDeletingSession(null);
    }
  }

  async function handleLogoutAll() {
    setLoggingOutAll(true);
    try {
      await auth.logoutAll();
      toast.success("Все сессии завершены. Выполняется выход...");
      window.location.href = "/login";
    } catch {
      toast.error("Ошибка завершения сессий");
    } finally {
      setLoggingOutAll(false);
    }
  }

  function getDeviceIcon(userAgent?: string) {
    if (!userAgent) return Monitor;
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return Smartphone;
    }
    return Monitor;
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground">Управление аккаунтом</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Личные данные
          </CardTitle>
          <CardDescription>Обновите свои личные данные</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user.email || ""} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={user.username} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Имя</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label>Фамилия</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Текущий пароль</Label>
            <Input
              type="password"
              value={oldPass}
              onChange={(e) => setOldPass(e.target.value)}
            />
          </div>
          <div>
            <Label>Новый пароль</Label>
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>
          <div>
            <Label>Подтвердите пароль</Label>
            <Input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPass}>
            {changingPass ? "Изменение..." : "Изменить пароль"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" /> Активные сессии
              </CardTitle>
              <CardDescription>
                Управление устройствами, на которых вы вошли в систему
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={loggingOutAll}
                >
                  {loggingOutAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-1" />
                      Выйти везде
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Выйти из всех устройств?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Вы будете разлогинены на всех устройствах, включая текущее.
                    Потребуется повторный вход.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogoutAll}>
                    Выйти везде
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет активных сессий
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.user_agent);
                return (
                  <div
                    key={session.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-muted">
                        <DeviceIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {session.ip_address || "Неизвестный IP"}
                          </span>
                          {session.is_current && (
                            <Badge variant="secondary" className="text-xs">
                              Текущая
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {session.user_agent || "Неизвестное устройство"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Последняя активность:{" "}
                          {formatDate(session.last_used_at)}
                        </p>
                      </div>
                    </div>
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSession(session.id)}
                        disabled={deletingSession === session.id}
                      >
                        {deletingSession === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Статус верификации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {user.email_verified ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Email подтвержден</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium">Email не подтвержден</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email || "Email не указан"}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
