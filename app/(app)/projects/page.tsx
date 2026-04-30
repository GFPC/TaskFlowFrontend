"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { projects } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, Users, CheckCircle2, Plus, Search } from "lucide-react";

export default function ProjectsPage() {
  const [q, setQ] = useState("");
  const { data: projectsList, isLoading } = useSWR(
    "projects",
    () => projects.list(),
    { dedupingInterval: 300000 },
  );

  const filtered = useMemo(() => {
    if (!projectsList) return [];
    const s = q.trim().toLowerCase();
    if (!s) return projectsList;
    return projectsList.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s) ||
        p.team_name.toLowerCase().includes(s) ||
        (p.description?.toLowerCase().includes(s) ?? false),
    );
  }, [projectsList, q]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Каталог
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Проекты
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Все проекты, в которых вы участвуете — статус, команда и загрузка
            задач
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Поиск по названию, команде…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Поиск проектов"
            />
          </div>
          <Button asChild className="shrink-0">
            <Link href="/projects/new" className="gap-1">
              <Plus className="h-4 w-4" />
              Новый проект
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !projectsList?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Нет проектов
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте проект в одной из ваших команд
            </p>
            <Button asChild>
              <Link href="/projects/new">Создать проект</Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 && q.trim() ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Нет проектов по запросу «{q.trim()}»
            </p>
            <Button variant="link" className="mt-2" onClick={() => setQ("")}>
              Сбросить поиск
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`}>
              <Card className="h-full cursor-pointer border-border/60 shadow-sm transition-all hover:border-primary/35 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge
                      variant={
                        project.status === "active" ? "default" : "secondary"
                      }
                    >
                      {project.status === "active" ? "Активный" : "В архиве"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {project.description || project.team_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.members_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {project.tasks_count ?? 0} задач
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {project.team_name}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
