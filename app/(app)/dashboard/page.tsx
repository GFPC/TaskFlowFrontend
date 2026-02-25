"use client";

import useSWR from "swr";
import Link from "next/link";
import { teams, projects } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, Plus, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: teamsList, isLoading: teamsLoading } = useSWR(
    "teams",
    () => teams.list(),
    { dedupingInterval: 300000 }
  );
  const { data: projectsList, isLoading: projectsLoading } = useSWR(
    "projects",
    () => projects.list(),
    { dedupingInterval: 300000 }
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {"Добро пожаловать, "}{user?.first_name || "Пользователь"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Обзор ваших команд и проектов
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {teamsLoading ? <Skeleton className="h-7 w-8 inline-block" /> : teamsList?.length ?? 0}
              </div>
              <p className="text-sm text-muted-foreground">Команд</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {projectsLoading ? <Skeleton className="h-7 w-8 inline-block" /> : projectsList?.length ?? 0}
              </div>
              <p className="text-sm text-muted-foreground">Проектов</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {projectsLoading ? (
                  <Skeleton className="h-7 w-8 inline-block" />
                ) : (
                  projectsList?.reduce((acc, p) => acc + p.tasks_count, 0) ?? 0
                )}
              </div>
              <p className="text-sm text-muted-foreground">Задач</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teams */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Мои команды</h2>
          <div className="flex gap-2">
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
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : teamsList?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">У вас пока нет команд</p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/teams/new">Создать команду</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teamsList?.map((team) => (
              <Link key={team.id} href={`/teams/${team.slug}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
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
                      {team.projects_count}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Мои проекты</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects" className="gap-1">
              Все проекты
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : projectsList?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FolderKanban className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">У вас пока нет проектов</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectsList?.slice(0, 6).map((project) => (
              <Link key={project.id} href={`/projects/${project.slug}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>
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
                      {project.tasks_count} задач
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
