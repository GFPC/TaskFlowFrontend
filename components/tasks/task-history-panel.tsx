"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import {
  tasks as tasksApi,
  meta,
  formatApiError,
  type TaskEvent,
} from "@/lib/api";
import {
  formatEventDate,
  formatTaskEventMessage,
} from "@/lib/task-event-utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type TaskHistoryPanelProps = {
  projectSlug: string;
  taskId: number;
  /** Initial events from TaskDetailResponse (last 50). */
  initialEvents?: TaskEvent[];
  compact?: boolean;
  onOpenTask?: (taskId: number) => void;
};

export function TaskHistoryPanel({
  projectSlug,
  taskId,
  initialEvents,
  compact = false,
}: TaskHistoryPanelProps) {
  const [eventType, setEventType] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<TaskEvent[]>(initialEvents ?? []);
  const [hasMore, setHasMore] = useState(
    (initialEvents?.length ?? 0) >= PAGE_SIZE,
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: eventTypes } = useSWR("meta-task-event-types", () =>
    meta.taskEventTypes(),
  );

  const filterKey =
    eventType === "all"
      ? null
      : (["task-history", projectSlug, taskId, eventType] as const);

  const { data: filtered, isLoading: filterLoading } = useSWR(
    filterKey,
    () =>
      tasksApi.events(projectSlug, taskId, {
        limit: PAGE_SIZE,
        offset: 0,
        event_type: eventType,
      }),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (eventType !== "all") return;
    setItems(initialEvents ?? []);
    setOffset(0);
    setHasMore((initialEvents?.length ?? 0) >= PAGE_SIZE);
  }, [eventType, initialEvents, taskId]);

  useEffect(() => {
    if (eventType === "all" || !filtered) return;
    setItems(filtered);
    setOffset(0);
    setHasMore(filtered.length >= PAGE_SIZE);
  }, [eventType, filtered]);

  const loadMore = useCallback(async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const batch = await tasksApi.events(projectSlug, taskId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
        event_type: eventType === "all" ? undefined : eventType,
      });
      setItems((prev) => [...prev, ...batch]);
      setOffset(nextOffset);
      setHasMore(batch.length >= PAGE_SIZE);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoadingMore(false);
    }
  }, [projectSlug, taskId, offset, eventType]);

  const loading = eventType !== "all" && filterLoading && items.length === 0;

  return (
    <div className={cn("space-y-3", compact && "text-sm")}>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          История изменений задачи
        </p>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Тип события" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {(eventTypes ?? []).map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.display_name ?? t.label ?? t.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Событий пока нет
        </p>
      ) : (
        <ul className="space-y-2 max-h-[min(360px,50vh)] overflow-y-auto pr-1">
          {items.map((ev) => (
            <li
              key={ev.id}
              className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
            >
              <p className="text-sm text-foreground">
                {formatTaskEventMessage(ev)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                @{ev.user_username} · {formatEventDate(ev.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Загрузить ещё
        </Button>
      )}
    </div>
  );
}

type ProjectHistoryPanelProps = {
  projectSlug: string;
  onOpenTask?: (taskId: number) => void;
};

export function ProjectHistoryPanel({
  projectSlug,
  onOpenTask,
}: ProjectHistoryPanelProps) {
  const [eventType, setEventType] = useState<string>("all");
  const [taskIdFilter, setTaskIdFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<TaskEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const parsedTaskId = taskIdFilter.trim()
    ? Number.parseInt(taskIdFilter.trim(), 10)
    : undefined;

  const swrKey = [
    "project-history",
    projectSlug,
    eventType,
    parsedTaskId ?? "",
    offset === 0 ? 0 : "reset",
  ] as const;

  const { data, isLoading, mutate } = useSWR(
    swrKey,
    () =>
      tasksApi.projectHistory(projectSlug, {
        limit: 100,
        offset: 0,
        event_type: eventType === "all" ? undefined : eventType,
        task_id: Number.isFinite(parsedTaskId) ? parsedTaskId : undefined,
      }),
    { revalidateOnFocus: false },
  );

  const { data: eventTypes } = useSWR("meta-task-event-types", () =>
    meta.taskEventTypes(),
  );

  useEffect(() => {
    if (!data) return;
    setItems(data);
    setOffset(0);
    setHasMore(data.length >= 100);
  }, [data]);

  const loadMore = async () => {
    const nextOffset = offset + 100;
    setLoadingMore(true);
    try {
      const batch = await tasksApi.projectHistory(projectSlug, {
        limit: 100,
        offset: nextOffset,
        event_type: eventType === "all" ? undefined : eventType,
        task_id: Number.isFinite(parsedTaskId) ? parsedTaskId : undefined,
      });
      setItems((prev) => [...prev, ...batch]);
      setOffset(nextOffset);
      setHasMore(batch.length >= 100);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const applyFilters = () => {
    void mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">
            № задачи
          </label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            placeholder="Все задачи"
            value={taskIdFilter}
            onChange={(e) => setTaskIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">
            Тип события
          </label>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              {(eventTypes ?? []).map((t) => (
                <SelectItem key={t.code} value={t.code}>
                  {t.display_name ?? t.label ?? t.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" onClick={applyFilters}>
          Применить
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          История проекта пуста
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((ev) => {
            const displayTaskId =
              ev.task_id ??
              (ev.metadata?.task_id != null
                ? Number(ev.metadata.task_id)
                : null);
            return (
              <li
                key={ev.id}
                className="rounded-lg border border-border/60 bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {formatTaskEventMessage(ev)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      @{ev.user_username} · {formatEventDate(ev.created_at)}
                    </p>
                  </div>
                  {displayTaskId != null && onOpenTask ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0"
                      onClick={() => onOpenTask(displayTaskId)}
                    >
                      Задача №{displayTaskId}
                    </Button>
                  ) : displayTaskId != null ? (
                    <span className="text-xs text-muted-foreground shrink-0">
                      №{displayTaskId}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && !isLoading && (
        <Button
          type="button"
          variant="outline"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Загрузить ещё
        </Button>
      )}
    </div>
  );
}
