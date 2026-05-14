"use client";

import type { ReactNode } from "react";
import useSWR from "swr";
import Link from "next/link";
import { teams, projects } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderKanban,
  Plus,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";
import { MyTasksFeed } from "@/components/dashboard/my-tasks-feed";
import { cn } from "@/lib/utils";
import { ruProjectsCount } from "@/lib/ru-plurals";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
      {children}
    </p>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: teamsList, isLoading: teamsLoading } = useSWR(
    "teams",
    () => teams.list(),
    { dedupingInterval: 300000 },
  );
  const { data: projectsList, isLoading: projectsLoading } = useSWR(
    "projects",
    () => projects.list(),
    { dedupingInterval: 300000 },
  );

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          aria-hidden
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-chart-2/[0.06]" />
          <div className="app-main-dots absolute inset-0 opacity-25 dark:opacity-15" />
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                Рабочий стол
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Добро пожаловать
                {user?.first_name ? `, ${user.first_name}` : ""}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Сводка по командам и проектам. Ниже — ваши активные задачи и
                быстрый доступ к рабочим пространствам.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              asChild
            >
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Новый проект
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {[
              {
                label: "Команд",
                loading: teamsLoading,
                value: teamsList?.length ?? 0,
                icon: Users,
                tint: "text-primary",
                bg: "bg-primary/12",
              },
              {
                label: "Проектов",
                loading: projectsLoading,
                value: projectsList?.length ?? 0,
                icon: FolderKanban,
                tint: "text-chart-2",
                bg: "bg-chart-2/12",
              },
              {
                label: "Задач всего",
                loading: projectsLoading,
                value:
                  projectsList?.reduce(
                    (acc, p) => acc + (p.tasks_count ?? 0),
                    0,
                  ) ?? 0,
                icon: CheckCircle2,
                tint: "text-chart-3",
                bg: "bg-chart-3/12",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "flex items-center gap-4 rounded-xl border border-border/50 bg-background/70 px-4 py-4 shadow-sm",
                  "transition-shadow hover:shadow-md",
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    stat.bg,
                    stat.tint,
                  )}
                >
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                    {stat.loading ? (
                      <Skeleton className="inline-block h-8 w-10" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MyTasksFeed />

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel>Команды</SectionLabel>
            <h2 className="text-lg font-semibold text-foreground">
              Мои команды
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Участники, проекты и роли в одном месте
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/teams/join">Вступить</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/teams/new" className="gap-1">
                <Plus className="h-4 w-4" />
                Создать
              </Link>
            </Button>
          </div>
        </div>

        {teamsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : teamsList?.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                У вас пока нет команд
              </p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/teams/new">Создать команду</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamsList?.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`}>
                <Card className="h-full cursor-pointer border-border/60 shadow-sm transition-all hover:border-primary/35 hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{team.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {team.description || "Нет описания"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {team.members_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {ruProjectsCount(team.projects_count ?? 0)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <SectionLabel>Проекты</SectionLabel>
            <h2 className="text-lg font-semibold text-foreground">
              Недавние проекты
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              До шести проектов — полный список на странице «Проекты»
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects" className="gap-1">
              Все проекты
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projectsList?.length === 0 ? (
          <Card className="border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                У вас пока нет проектов
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsList?.slice(0, 6).map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <Card className="h-full cursor-pointer border-border/60 shadow-sm transition-all hover:border-primary/35 hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                        className="shrink-0"
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
