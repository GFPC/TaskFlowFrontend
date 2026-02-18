"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";

export default function RecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<"initiate" | "reset">("initiate");
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setLoading(true);
    try {
      const res = await auth.recoveryInitiate(username);
      if (res.success && res.recovery_code) {
        setRecoveryCode(res.recovery_code);
        setStep("reset");
        toast.success("Код восстановления отправлен в Telegram");
      } else {
        toast.info("Если пользователь существует, код будет отправлен");
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
      else toast.error("Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryCode || !newPassword) return;
    setLoading(true);
    try {
      await auth.recoveryReset({ recovery_code: recoveryCode, new_password: newPassword });
      toast.success("Пароль изменен! Войдите с новым паролем.");
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
      else toast.error("Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-balance">
          {step === "initiate" ? "Восстановление пароля" : "Новый пароль"}
        </CardTitle>
        <CardDescription className="text-balance">
          {step === "initiate"
            ? "Введите ваш логин для получения кода восстановления"
            : "Введите новый пароль"}
        </CardDescription>
      </CardHeader>

      {step === "initiate" ? (
        <form onSubmit={handleInitiate}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Отправить код
            </Button>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Вернуться ко входу
            </Link>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={handleReset}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Код восстановления</Label>
              <Input
                id="code"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                placeholder="Код из Telegram"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newpassword">Новый пароль</Label>
              <Input
                id="newpassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сменить пароль
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
