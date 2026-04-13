"use client";

import useSWR from "swr";
import Link from "next/link";
import { projects, tasks, type Project, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ListTodo,
  Flame,
  PlayCircle,
  Lock,
  Clock,
  FolderKanban,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export type TaskFeedItem = Task & {
  project_slug: string;
  project_name: string;
  team_name: string;
};

async function fetchAssignedTasksFeed(username: string): Promise<TaskFeedItem[]> {
  const projectList = await projects.list();
  const active = projectList.filter((p) => p.status === "active");
  if (active.length === 0) return [];

  const batches = await Promise.all(
    active.map(async (p: Project) => {
      try {
        const list = await tasks.list(p.slug, {
          assignee_username: username,
          limit: 80,
        });
        return list.map((t) => ({
          ...t,
          project_slug: p.slug,
          project_name: p.name,
          team_name: p.team_name,
        }));
      } catch {
        return [];
      }
    }),
  );

  const merged = batches.flat();
  const open = merged.filter((t) => t.status !== "completed");
  return sortFeedItems(open);
}

function sortFeedItems(items: TaskFeedItem[]): TaskFeedItem[] {
  return [...items].sort((a, b) => {
    const rank = (t: TaskFeedItem) => {
      const overdue =
        t.deadline &&
        new Date(t.deadline).getTime() < Date.now() &&
        t.status !== "completed";
      if (overdue) return 0;
      if (t.status === "blocked") return 1;
      if (t.is_ready && t.status === "todo") return 2;
      if (t.status === "in_progress") return 3;
      if (t.status === "review") return 4;
      if (t.status === "todo") return 5;
      return 6;
    };
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    const ta = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    return ta - tb;
  });
}

function isOverdue(t: TaskFeedItem): boolean {
  if (!t.deadline || t.status === "completed") return false;
  return new Date(t.deadline).getTime() < Date.now();
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    todo: "К выполнению",
    in_progress: "В работе",
    review: "На проверке",
    completed: "Готово",
    blocked: "Блок",
  };
  return m[s] ?? s;
}

export function MyTasksFeed() {
  const { user } = useAuth();
  const { data: items, isLoading } = useSWR(
    user?.username ? ["dashboard-my-tasks", user.username] : null,
    () => fetchAssignedTasksFeed(user!.username),
    { dedupingInterval: 60_000, revalidateOnFocus: true },
  );

  if (!user?.username) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(at 0% 0%, hsl(var(--primary) / 0.12) 0px, transparent 50%),
            radial-gradient(at 100% 100%, hsl(var(--chart-2) / 0.08) 0px, transparent 45%)`,
        }}
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Мои задачи
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                Назначенные вам задачи по всем проектам: сначала сгоревшие дедлайны
                и то, к чему можно приступить.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 mt-2 sm:mt-0" asChild>
            <Link href="/projects" className="gap-1">
              Все проекты
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
            ))}
          </div>
        ) : !items?.length ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-14 text-center">
            <ListTodo className="h-10 w-10 text-muted-foreground/70 mb-3" />
            <p className="text-sm font-medium text-foreground">
              Нет активных задач с вами как исполнителем
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Когда коллеги назначат вас на задачи, они появятся здесь.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[min(420px,55vh)] pr-3 -mr-1">
            <ul className="flex flex-col gap-2.5 pb-1">
              {items.map((t) => {
                const overdue = isOverdue(t);
                const ready = t.is_ready && t.status === "todo";
                const blocked = t.status === "blocked";

                return (
                  <li key={`${t.project_slug}-${t.id}`}>
                    <Link
                      href={`/projects/${t.project_slug}`}
                      className={cn(
                        "group flex gap-3 rounded-xl border p-3.5 transition-all",
                        "hover:border-primary/40 hover:bg-background/80 hover:shadow-md",
                        overdue &&
                          "border-destructive/35 bg-destructive/[0.06] shadow-[inset_3px_0_0_0_hsl(var(--destructive))]",
                        ready &&
                          !overdue &&
                          "border-success/30 bg-success/[0.04] shadow-[inset_3px_0_0_0_hsl(var(--success))]",
                        blocked &&
                          !overdue &&
                          !ready &&
                          "border-amber-500/25 bg-amber-500/[0.04] shadow-[inset_3px_0_0_0_hsl(var(--warning))]",
                        !overdue &&
                          !ready &&
                          !blocked &&
                          "border-border/70 bg-background/40 shadow-[inset_3px_0_0_0_hsl(var(--primary)/0.35)]",
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal gap-1 max-w-full"
                          >
                            <FolderKanban className="h-3 w-3 shrink-0" />
                            <span className="truncate">{t.project_name}</span>
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal gap-1"
                          >
                            <Users className="h-3 w-3 shrink-0" />
                            {t.team_name}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {t.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5"
                            style={{
                              color: t.status_color,
                              borderColor: `${t.status_color}40`,
                            }}
                          >
                            {statusLabel(t.status)}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center gap-1 text-destructive font-medium">
                              <Flame className="h-3 w-3" />
                              Просрочено
                            </span>
                          )}
                          {ready && !overdue && (
                            <span className="inline-flex items-center gap-1 text-success font-medium">
                              <PlayCircle className="h-3 w-3" />
                              Можно начать
                            </span>
                          )}
                          {blocked && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <Lock className="h-3 w-3" />
                              Заблокирована
                            </span>
                          )}
                          {t.deadline && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1",
                                overdue && "text-destructive",
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              {new Date(t.deadline).toLocaleString("ru", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                          {t.priority > 0 && (
                            <span className="text-muted-foreground/80">
                              {t.priority === 2
                                ? "Высокий приоритет"
                                : "Средний приоритет"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 mt-1" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </div>
    </section>
  );
}
