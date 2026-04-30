"use client";

import useSWR from "swr";
import Link from "next/link";
import { teams } from "@/lib/api";
import { ruProjectsCount } from "@/lib/ru-plurals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, Plus } from "lucide-react";

export default function TeamsPage() {
  const { data: teamsList, isLoading } = useSWR("teams", () => teams.list(), {
    dedupingInterval: 300000,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Организация
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Команды
          </h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Рабочие группы, участники и проекты — точка входа в совместную
            работу
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/teams/join">Вступить по коду</Link>
          </Button>
          <Button asChild>
            <Link href="/teams/new" className="gap-1">
              <Plus className="h-4 w-4" />
              Создать
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
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teamsList?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Нет команд
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Создайте команду или вступите по коду приглашения
            </p>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/teams/join">Вступить по коду</Link>
              </Button>
              <Button asChild>
                <Link href="/teams/new">Создать команду</Link>
              </Button>
            </div>
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
                    {team.members_count} участн.
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
    </div>
  );
}
