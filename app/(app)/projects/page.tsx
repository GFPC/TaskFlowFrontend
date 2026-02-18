"use client";

import useSWR from "swr";
import Link from "next/link";
import { projects } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, Users, CheckCircle2, Plus } from "lucide-react";

export default function ProjectsPage() {
  const { data: projectsList, isLoading } = useSWR(
    "projects",
    () => projects.list(),
    { dedupingInterval: 300000 }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Проекты</h1>
          <p className="text-muted-foreground mt-1">Все ваши проекты</p>
        </div>
        <Button asChild>
          <Link href="/projects/new" className="gap-1">
            <Plus className="h-4 w-4" />
            Новый проект
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-24" /></CardContent>
            </Card>
          ))}
        </div>
      ) : projectsList?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Нет проектов</h3>
            <p className="text-sm text-muted-foreground mb-4">Создайте проект в одной из ваших команд</p>
            <Button asChild>
              <Link href="/projects/new">Создать проект</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsList?.map((project) => (
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
                  <Badge variant="outline" className="text-xs">{project.team_name}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
