"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { cn } from "@/lib/utils";

type DependencyEdgeData = {
  dependency_id?: number;
  description?: string;
};

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
    typeof label === "string"
      ? label
      : data?.description?.trim()
        ? data.description
        : null;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.75 : 2,
          /* --primary — oklch, не hsl: нельзя оборачивать в hsl() */
          stroke: "var(--primary)",
          opacity: selected ? 1 : 0.72,
        }}
      />
      {caption ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="nodrag nopan max-w-[min(160px,40vw)]"
          >
            <span
              className={cn(
                "inline-block text-[10px] font-medium leading-tight px-2 py-0.5 rounded-md",
                "bg-background/95 backdrop-blur-sm border border-border/70 shadow-sm",
                "text-muted-foreground truncate",
              )}
            >
              {caption}
            </span>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
