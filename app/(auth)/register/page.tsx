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
import { Loader2, UserPlus } from "lucide-react";
import { VerificationDialog } from "@/components/auth/verification-dialog";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    username: "",
    password: "",
    email: "",
    tg_username: "",
  });
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState<{
    userId: number;
    tgCode: string;
  } | null>(null);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return "Минимум 8 символов";
    if (!/[A-Z]/.test(pw)) return "Нужна хотя бы одна заглавная буква";
    if (!/[a-z]/.test(pw)) return "Нужна хотя бы одна строчная буква";
    if (!/[0-9]/.test(pw)) return "Нужна хотя бы одна цифра";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwError = validatePassword(form.password);
    if (pwError) {
      toast.error(pwError);
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = {
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        password: form.password,
      };
      if (form.email) payload.email = form.email;
      if (form.tg_username) payload.tg_username = form.tg_username;

      const result = await register(payload as Parameters<typeof register>[0]);
      setVerification({ userId: result.user_id, tgCode: result.tg_code });
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
    toast.success("Аккаунт создан и верифицирован!");
    router.push("/dashboard");
  };

  return (
    <>
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-balance">Создать аккаунт</CardTitle>
          <CardDescription className="text-balance">
            Зарегистрируйтесь в TaskFlow для управления проектами
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="first_name">Имя</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="Иван"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="last_name">Фамилия</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Иванов"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => updateField("username", e.target.value)}
                placeholder="ivanov"
                autoComplete="username"
                required
              />
              <p className="text-xs text-muted-foreground">3-50 символов, a-z, 0-9, _, ., -</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                required
              />
              <p className="text-xs text-muted-foreground">
                Заглавные, строчные буквы и цифры
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email (необязательно)</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="ivanov@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tg_username">Telegram (необязательно)</Label>
              <Input
                id="tg_username"
                value={form.tg_username}
                onChange={(e) => updateField("tg_username", e.target.value)}
                placeholder="@ivanov"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 mt-8">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зарегистрироваться
            </Button>
            <p className="text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Войти
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
