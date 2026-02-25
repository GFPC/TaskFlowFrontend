"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
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
import { Loader2, LogIn } from "lucide-react";
import { VerificationDialog } from "@/components/auth/verification-dialog";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<{
    userId: number;
    tgCode: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.type === "verification_required") {
        setVerification({
          userId: result.user_id,
          tgCode: result.tg_code,
        });
      } else {
        toast.success("Вы вошли в систему");
        router.push("/dashboard");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error("Ошибка соединения с сервером");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = () => {
    setVerification(null);
    toast.success("Telegram верифицирован! Вы вошли в систему.");
    router.push("/dashboard");
  };

  return (
    <>
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LogIn className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-balance">TaskFlow</CardTitle>
          <CardDescription className="text-balance">
            Войдите в аккаунт для управления проектами
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
                <Link
                  href="/recovery"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Забыли пароль?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                autoComplete="current-password"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-8">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Войти
            </Button>
            <p className="text-sm text-muted-foreground">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {verification && (
        <VerificationDialog
          userId={verification.userId}
          tgCode={verification.tgCode}
          onSuccess={handleVerificationSuccess}
          onClose={() => setVerification(null)}
        />
      )}
    </>
  );
}
