"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { teams, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { mutate } from "swr";

export default function JoinTeamPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await teams.joinByCode(code.trim());
      mutate("teams");
      toast.success(`Вы присоединились к команде "${result.team.name}"`);
      router.push(`/teams/${result.team.slug}`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
      else toast.error("Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl text-center">Вступить в команду</CardTitle>
          <CardDescription className="text-center">
            Введите код приглашения, который вам дали
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Код приглашения</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="xK3mF9pL2nR5"
                className="font-mono text-center text-lg"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !code.trim()} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Вступить
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
