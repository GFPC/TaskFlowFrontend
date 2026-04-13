"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  Flag,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskNodeData {
  id: number;
  name: string;
  status: "todo" | "in_progress" | "review" | "completed" | "blocked";
  status_color: string;
  assignee: string | null;
  creator: string;
  priority: 0 | 1 | 2;
  deadline: string | null;
  is_ready: boolean;
}

function TaskNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TaskNodeData;

  const statusIcons: Record<string, React.ReactNode> = {
    todo: <Flag className="h-3 w-3 shrink-0" />,
    in_progress: <Loader2 className="h-3 w-3 animate-spin shrink-0" />,
    review: <AlertCircle className="h-3 w-3 shrink-0" />,
    completed: <CheckCircle2 className="h-3 w-3 shrink-0" />,
    blocked: <AlertCircle className="h-3 w-3 shrink-0" />,
  };

  const statusLabels: Record<string, string> = {
    todo: "К выполнению",
    in_progress: "В работе",
    review: "На проверке",
    completed: "Выполнена",
    blocked: "Заблокирована",
  };

  const priorityColors: Record<number, string> = {
    0: "text-muted-foreground",
    1: "text-warning",
    2: "text-destructive",
  };

  const getDeadlineColor = () => {
    if (!nodeData.deadline) return "text-muted-foreground";
    const diff = new Date(nodeData.deadline).getTime() - Date.now();
    if (diff < 0) return "text-destructive font-semibold";
    if (diff < 60 * 60 * 1000) return "text-destructive";
    if (diff < 24 * 60 * 60 * 1000) return "text-warning";
    if (diff < 7 * 24 * 60 * 60 * 1000) return "text-primary";
    return "text-success";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "rounded-xl border bg-card/95 backdrop-blur-sm w-[248px] overflow-hidden transition-all duration-200",
          "shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_8px_24px_-4px_hsl(var(--foreground)/0.08)]",
          selected &&
            "ring-2 ring-primary/80 ring-offset-2 ring-offset-background shadow-lg",
          nodeData.status === "todo" &&
            !nodeData.is_ready &&
            "opacity-[0.72] saturate-[0.85] bg-muted/40",
          nodeData.status === "todo" &&
            nodeData.is_ready &&
            "ring-2 ring-success/70 ring-offset-2 ring-offset-background shadow-[0_0_0_1px_hsl(var(--success)/0.25),0_12px_32px_-8px_hsl(var(--success)/0.35)] border-success/40",
          nodeData.status === "blocked" &&
            "border-destructive/60 bg-destructive/[0.03]",
          nodeData.status === "completed" && "opacity-[0.88] bg-muted/25",
          nodeData.status === "todo" && !nodeData.is_ready && "border-dashed",
        )}
        style={{
          borderLeftWidth: "5px",
          borderLeftColor: nodeData.status_color,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-background !bg-primary/90 !shadow-sm"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3 pt-3.5">
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] gap-1 px-2 py-0.5 font-medium border bg-background/50",
                    nodeData.status === "in_progress" && "animate-pulse",
                  )}
                  style={{
                    color: nodeData.status_color,
                    borderColor: `${nodeData.status_color}55`,
                  }}
                >
                  {statusIcons[nodeData.status]}
                  <span className="truncate max-w-[120px]">
                    {statusLabels[nodeData.status]}
                  </span>
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  {nodeData.is_ready && nodeData.status === "todo" && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                      <Play className="h-3 w-3" />
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums tracking-tight",
                      priorityColors[nodeData.priority],
                    )}
                    aria-label="Приоритет"
                  >
                    {nodeData.priority === 2
                      ? "★★★"
                      : nodeData.priority === 1
                        ? "★★"
                        : "★"}
                  </span>
                </div>
              </div>

              <p
                className={cn(
                  "text-[13px] font-semibold text-foreground leading-snug line-clamp-2 mb-2.5 tracking-tight",
                  nodeData.status === "completed" &&
                    "line-through text-muted-foreground decoration-muted-foreground/50",
                )}
              >
                {nodeData.name}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                {nodeData.assignee && (
                  <div className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 max-w-full">
                    <User className="h-2.5 w-2.5 shrink-0 opacity-80" />
                    <span className="truncate max-w-[100px]">
                      {nodeData.assignee}
                    </span>
                  </div>
                )}

                {nodeData.deadline && (
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-0.5",
                      getDeadlineColor(),
                      "bg-muted/40",
                    )}
                  >
                    <Clock className="h-2.5 w-2.5 shrink-0 opacity-80" />
                    {new Date(nodeData.deadline).toLocaleDateString("ru", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          {!nodeData.is_ready && nodeData.status === "todo" && (
            <TooltipContent side="top" className="max-w-xs text-xs">
              Ожидает выполнения задач, от которых зависит эта
            </TooltipContent>
          )}
        </Tooltip>

        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !border-2 !border-background !bg-primary/90 !shadow-sm"
        />
      </div>
    </TooltipProvider>
  );
}

export const TaskNode = memo(TaskNodeComponent);
