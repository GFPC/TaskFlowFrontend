"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { teams, projects, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTeam = searchParams.get("team") || "";

  const { data: teamsList } = useSWR("teams", () => teams.list(), {
    dedupingInterval: 300000,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamSlug, setTeamSlug] = useState(defaultTeam);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamSlug) return;
    setLoading(true);
    try {
      const project = await projects.create({
        name: name.trim(),
        description: description.trim() || undefined,
        team_slug: teamSlug,
      });
      mutate("projects");
      mutate(`team-projects-${teamSlug}`);
      toast.success("Проект создан!");
      router.push(`/projects/${project.slug}`);
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
          <CardTitle className="text-xl">Новый проект</CardTitle>
          <CardDescription>Создайте проект в одной из ваших команд</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="team">Команда</Label>
              <Select value={teamSlug} onValueChange={setTeamSlug} required>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите команду" />
                </SelectTrigger>
                <SelectContent>
                  {teamsList?.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Мой проект"
                required
                minLength={2}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Описание (необязательно)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="О чем проект?"
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !teamSlug}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Создать
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense>
      <NewProjectForm />
    </Suspense>
  );
}
