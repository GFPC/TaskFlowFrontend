"use client";

import useSWR from "swr";
import Link from "next/link";
import { teams } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FolderKanban, Plus, Crown, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeamsPage() {
  const { data: teamsList, isLoading } = useSWR(
    "teams",
    () => teams.list(),
    { dedupingInterval: 300000 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Команды</h1>
          <p className="text-muted-foreground mt-1">Управляйте своими командами</p>
        </div>
        <div className="flex gap-2">
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
            <h3 className="text-lg font-semibold text-foreground mb-1">Нет команд</h3>
            <p className="text-sm text-muted-foreground mb-4">Создайте команду или вступите по коду приглашения</p>
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
                    {team.members_count} участн.
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {team.projects_count} проектов
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
