"use client";

import { use, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  projects,
  reports as reportsApi,
  formatApiError,
  ApiError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useUserPermissions } from "@/lib/user-permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { toast } from "sonner";
import {
  ChevronLeft,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Выполнена",
  blocked: "Заблокирована",
};

const throughputChartConfig = {
  created: { label: "Создано", color: "hsl(var(--chart-1))" },
  completed: { label: "Завершено", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

function toIsoStart(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

function toIsoEnd(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();
  const { canViewReports, canViewOverview, canViewThroughput } =
    useUserPermissions(user);

  const defaults = useMemo(() => defaultDateRange(), []);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [applied, setApplied] = useState({ from: defaults.from, to: defaults.to });

  const { data: project, isLoading: projectLoading } = useSWR(
    slug ? ["project", slug] : null,
    () => projects.get(slug),
  );

  const queryParams = {
    date_from: toIsoStart(applied.from),
    date_to: toIsoEnd(applied.to),
  };

  const {
    data: overview,
    error: overviewError,
    isLoading: overviewLoading,
  } = useSWR(
    canViewOverview && slug
      ? ["report-overview", slug, applied.from, applied.to]
      : null,
    () => reportsApi.overview(slug, queryParams),
    { shouldRetryOnError: false },
  );

  const {
    data: throughput,
    error: throughputError,
    isLoading: throughputLoading,
  } = useSWR(
    canViewThroughput && slug
      ? ["report-throughput", slug, applied.from, applied.to]
      : null,
    () => reportsApi.throughput(slug, queryParams),
    { shouldRetryOnError: false },
  );

  const forbidden =
    (overviewError instanceof ApiError && overviewError.status === 403) ||
    (throughputError instanceof ApiError && throughputError.status === 403);

  const applyPeriod = () => {
    setApplied({ from: dateFrom, to: dateTo });
  };

  if (!canViewReports && !projectLoading) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Недостаточно прав для просмотра отчётов</p>
          <Button asChild variant="outline">
            <Link href={`/projects/${slug}`}>К проекту</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-2" asChild>
            <Link href={`/projects/${slug}`}>
              <ChevronLeft className="h-4 w-4" />
              {project?.name ?? "Проект"}
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Отчёты
          </h1>
          <p className="text-muted-foreground mt-1">
            Сводка и динамика задач проекта
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Период</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="date-from">С</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="date-to">По</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <Button type="button" onClick={applyPeriod}>
            Применить
          </Button>
        </CardContent>
      </Card>

      {forbidden ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Недостаточно прав для просмотра отчётов по этому проекту
          </CardContent>
        </Card>
      ) : (
        <>
          {canViewOverview && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overviewLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
              ) : overview ? (
                <>
                  <MetricCard label="Всего задач" value={overview.total_tasks} />
                  <MetricCard label="Открытых" value={overview.open_tasks} />
                  <MetricCard label="Завершено" value={overview.completed_tasks} />
                  <MetricCard label="Просрочено" value={overview.overdue_tasks} />
                  <MetricCard
                    label="Создано за период"
                    value={overview.created_in_period}
                  />
                  <MetricCard
                    label="Завершено за период"
                    value={overview.completed_in_period}
                  />
                  <MetricCard
                    label="Средний цикл (ч)"
                    value={
                      overview.avg_cycle_time_hours != null
                        ? overview.avg_cycle_time_hours.toFixed(1)
                        : "—"
                    }
                  />
                </>
              ) : overviewError ? (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-destructive text-sm">
                    {formatApiError(overviewError)}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {canViewOverview && overview?.by_status && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">По статусам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Object.entries(overview.by_status).map(([status, count]) => (
                    <div
                      key={status}
                      className="rounded-lg border px-3 py-2 text-center"
                    >
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">
                        {STATUS_LABELS[status] ?? status}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canViewThroughput && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Throughput</CardTitle>
                <CardDescription>
                  Созданные и завершённые задачи по дням
                </CardDescription>
              </CardHeader>
              <CardContent>
                {throughputLoading ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : throughput?.points?.length ? (
                  <ChartContainer
                    config={throughputChartConfig}
                    className="h-[280px] w-full"
                  >
                    <LineChart data={throughput.points} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          new Date(v).toLocaleDateString("ru", {
                            day: "numeric",
                            month: "short",
                          })
                        }
                      />
                      <YAxis tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="created"
                        stroke="var(--color-created)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="completed"
                        stroke="var(--color-completed)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : throughputError ? (
                  <p className="text-sm text-destructive text-center py-8">
                    {formatApiError(throughputError)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Нет данных за выбранный период
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {canViewOverview && !canViewThroughput && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                График throughput доступен ролям с правом «Аналитика».
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
