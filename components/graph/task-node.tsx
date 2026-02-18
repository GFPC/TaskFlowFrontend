"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Flag, CheckCircle2, AlertCircle, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskNodeData {
  id: number;
  name: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
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
    todo: <Flag className="h-3 w-3" />,
    in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
    review: <AlertCircle className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    blocked: <AlertCircle className="h-3 w-3" />,
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

  const isDeadlineSoon = nodeData.deadline
    ? new Date(nodeData.deadline).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false;

  const isOverdue = nodeData.deadline
    ? new Date(nodeData.deadline).getTime() < Date.now()
    : false;

  const getDeadlineColor = () => {
    if (!nodeData.deadline) return "text-muted-foreground";
    const diff = new Date(nodeData.deadline).getTime() - Date.now();
    if (diff < 0) return "text-destructive font-bold"; // 💀 просрочено
    if (diff < 60 * 60 * 1000) return "text-destructive"; // 🔴 < 1 часа
    if (diff < 24 * 60 * 60 * 1000) return "text-warning"; // 🟡 < 24 часов
    if (diff < 7 * 24 * 60 * 60 * 1000) return "text-primary"; // < 7 дней
    return "text-success"; // 🟢 > 7 дней
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "rounded-lg border bg-card shadow-md w-60 overflow-hidden transition-all",
          selected && "ring-2 ring-primary shadow-lg",
          nodeData.status === 'todo' && !nodeData.is_ready && "opacity-60 grayscale-[0.5] bg-muted/30",
          nodeData.status === 'todo' && nodeData.is_ready && "ring-2 ring-success shadow-[0_0_15px_rgba(34,197,94,0.3)] border-success",
          nodeData.status === 'blocked' && "border-destructive ring-1 ring-destructive/30",
          nodeData.status === 'completed' && "opacity-75 bg-muted/20",
          nodeData.status === 'todo' && !nodeData.is_ready && "border-dashed"
        )}
        style={{ borderLeftWidth: '6px', borderLeftColor: nodeData.status_color }}
      >
        <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-card" />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] gap-1 px-1.5 py-0 font-medium",
                    nodeData.status === 'in_progress' && "animate-pulse"
                  )}
                  style={{ color: nodeData.status_color, borderColor: `${nodeData.status_color}40` }}
                >
                  {statusIcons[nodeData.status]}
                  {statusLabels[nodeData.status]}
                </Badge>
                <div className="flex items-center gap-1">
                  {nodeData.is_ready && nodeData.status === 'todo' && (
                    <Play className="h-3 w-3 text-success animate-bounce" />
                  )}
                  <span className={cn("text-[10px] font-bold", priorityColors[nodeData.priority])}>
                    {nodeData.priority === 2 ? "★★★" : nodeData.priority === 1 ? "★★" : "★"}
                  </span>
                </div>
              </div>

              <p className={cn(
                "text-sm font-semibold text-card-foreground leading-tight line-clamp-2 mb-2",
                nodeData.status === 'completed' && "line-through text-muted-foreground opacity-50"
              )}>
                {nodeData.name}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {nodeData.assignee && (
                  <div className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                    <User className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[60px]">{nodeData.assignee}</span>
                  </div>
                )}
                
                {nodeData.deadline && (
                  <div className={cn("flex items-center gap-1", getDeadlineColor())}>
                    <Clock className="h-2.5 w-2.5" />
                    {new Date(nodeData.deadline).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          {!nodeData.is_ready && nodeData.status === 'todo' && (
            <TooltipContent>
              <p>Ожидает выполнения родительских задач</p>
            </TooltipContent>
          )}
        </Tooltip>

        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-card" />
      </div>
    </TooltipProvider>
  );
}

export const TaskNode = memo(TaskNodeComponent);
