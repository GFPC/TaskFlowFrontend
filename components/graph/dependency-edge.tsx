"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import type { DependencyAction } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DependencyEdgeData = {
  dependency_id?: number;
  description?: string;
  actions?: DependencyAction[];
  state?: "blocked" | "unblocked";
  stateLabel?: string;
  stateReason?: string;
};

function actionSummary(a: DependencyAction): string {
  const parts = [a.action_type_code];
  if (a.delay_minutes != null) parts.push(`задержка ${a.delay_minutes} мин`);
  if (a.target_status) parts.push(`→ ${a.target_status}`);
  if (a.target_user_username) parts.push(`@${a.target_user_username}`);
  return parts.join(" · ");
}

function DependencyEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
  label,
}: EdgeProps<DependencyEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const caption =
    data?.stateLabel ??
    (typeof label === "string"
      ? label
      : data?.description?.trim()
        ? data.description
        : null);

  const actions = data?.actions ?? [];
  const showActions = actions.length > 0;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.75 : 2,
          stroke: (style.stroke as string) ?? "var(--primary)",
          opacity: selected ? 1 : 0.78,
        }}
      />
      {(caption || showActions) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan max-w-[min(220px,48vw)]"
          >
            <TooltipProvider delayDuration={150}>
              <div className="flex flex-col items-center gap-1">
                {caption ? (
                  data?.stateReason ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "inline-block cursor-help text-[10px] font-medium leading-tight px-2 py-0.5 rounded-md",
                            "bg-background/95 backdrop-blur-sm border border-border/70 shadow-sm",
                            "text-muted-foreground text-center",
                            data?.state === "unblocked" &&
                              "border-success/30 bg-success/10 text-success",
                            data?.state === "blocked" &&
                              "border-destructive/25 bg-destructive/10 text-destructive",
                          )}
                        >
                          {caption}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {data.stateReason}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span
                      className={cn(
                        "inline-block text-[10px] font-medium leading-tight px-2 py-0.5 rounded-md",
                        "bg-background/95 backdrop-blur-sm border border-border/70 shadow-sm",
                        "text-muted-foreground text-center",
                        data?.state === "unblocked" &&
                          "border-success/30 bg-success/10 text-success",
                        data?.state === "blocked" &&
                          "border-destructive/25 bg-destructive/10 text-destructive",
                      )}
                    >
                      {caption}
                    </span>
                  )
                ) : null}
                {showActions ? (
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {actions.map((a, i) => (
                      <Tooltip key={`${a.id}-${i}`}>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "cursor-default text-[9px] font-medium px-1.5 py-px rounded",
                              "bg-primary/10 text-primary border border-primary/25",
                              "max-w-[7rem] truncate",
                            )}
                          >
                            {a.action_type_code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          {actionSummary(a)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ) : null}
              </div>
            </TooltipProvider>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
