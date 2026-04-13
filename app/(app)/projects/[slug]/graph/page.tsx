"use client";

import { useParams, useRouter } from "next/navigation";

import useSWR from "swr";

import { useCallback, useEffect, useMemo, useState } from "react";

import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  type Connection,
  type Node,
  type Edge,
  Panel,
  type NodeChange,
  type EdgeChange,
} from "reactflow";

import "reactflow/dist/style.css";

import { tasks as tasksApi, ApiError, type GraphData } from "@/lib/api";

import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  Plus,
  Loader2,
  RefreshCw,
  LayoutGrid,
} from "lucide-react";

import { TaskNode } from "@/components/graph/task-node";

import { DependencyEdge } from "@/components/graph/dependency-edge";

import { TaskDetailDialog } from "@/components/graph/task-detail-dialog";

import { CreateTaskDialog } from "@/components/graph/create-task-dialog";

import { toast } from "sonner";

import { debounce } from "lodash";

import { Separator } from "@/components/ui/separator";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const nodeTypes = { taskNode: TaskNode };
const edgeTypes = {
  dependency: DependencyEdge,
  blocks: DependencyEdge,
  simple: DependencyEdge,
};

function graphToNodes(graphData: GraphData): Node[] {
  return graphData.nodes.map((n) => ({
    id: String(n.id),
    type: "taskNode",
    position: n.position,
    data: n.data,
  }));
}

function normalizeEdgeType(
  t: string | undefined,
): keyof typeof edgeTypes {
  if (t === "blocks" || t === "simple" || t === "dependency") return t;
  return "dependency";
}

function graphToEdges(graphData: GraphData): Edge[] {
  return graphData.edges.map((e) => ({
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    type: normalizeEdgeType(e.type),
    animated: e.animated ?? true,
    label: e.label,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: "var(--primary)",
    },
    data: {
      dependency_id: e.data?.dependency_id,
      description: e.data?.description,
      actions: e.data?.actions ?? [],
    },
    style: {
      stroke: "var(--primary)",
      strokeLinecap: "round",
    },
  }));
}

export default function GraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const {
    data: graphData,
    mutate,
    isLoading: graphLoading,
  } = useSWR(`graph-${slug}`, () => tasksApi.graph(slug), {
    dedupingInterval: 30_000,
  });

  const [nodes, setNodes, onNodesChangeState] = useNodesState([]);

  const [edges, setEdges, onEdgesChangeState] = useEdgesState([]);

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);

  const [snapGrid, setSnapGrid] = useState<[number, number]>([20, 20]);

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    if (graphData) {
      setNodes(graphToNodes(graphData));
      setEdges(graphToEdges(graphData));
      if (graphData.viewport) setViewport(graphData.viewport);
    }
  }, [graphData, setNodes, setEdges]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeState(changes);
      for (const c of changes) {
        if (c.type !== "remove") continue;
        const edge = edges.find((e) => e.id === c.id);
        if (!edge) continue;
        const depId = (edge.data as { dependency_id?: number } | undefined)
          ?.dependency_id;
        if (depId == null) {
          toast.error("Не удалось удалить связь — обновите граф");
          void mutate();
          continue;
        }
        void (async () => {
          try {
            await tasksApi.deleteDependency(slug, depId);
            toast.success("Связь удалена");
          } catch (err: unknown) {
            const detail =
              err instanceof ApiError ? err.detail : "Ошибка удаления связи";
            toast.error(detail);
            void mutate();
          }
        })();
      }
    },
    [onEdgesChangeState, edges, slug, mutate],
  );

  const debouncedSave = useMemo(
    () =>
      debounce(async (nds: Node[], eds: Edge[], vp: typeof viewport) => {
        const updatedGraph: GraphData = {
          nodes: nds.map((n) => ({
            id: n.id as string,
            type: n.type || "taskNode",
            data: n.data as GraphData["nodes"][0]["data"],
            position: n.position,
          })),
          edges: eds.map((e) => ({
            id: e.id,
            source: e.source as string,
            target: e.target as string,
            type: normalizeEdgeType(e.type),
            animated: e.animated,
            label: typeof e.label === "string" ? e.label : undefined,
            data: e.data as GraphData["edges"][0]["data"],
          })),
          viewport: vp,
        };
        try {
          await tasksApi.saveGraph(slug, updatedGraph);
          toast.success("Позиции сохранены", { duration: 1000 });
        } catch {
          toast.error("Ошибка автосохранения");
        }
      }, 500),
    [slug],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeState(changes);
      const hasPosChange = changes.some(
        (c) =>
          c.type === "position" &&
          (c as { dragging?: boolean }).dragging === false,
      );
      if (hasPosChange) {
        setNodes((nds) => {
          debouncedSave(nds, edges, viewport);
          return nds;
        });
      }
    },
    [onNodesChangeState, debouncedSave, setNodes, edges, viewport],
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceTaskId = (sourceNode?.data as { id?: number } | undefined)?.id;
      const targetTaskId = (targetNode?.data as { id?: number } | undefined)?.id;
      if (sourceTaskId == null || targetTaskId == null) {
        toast.error("Не удалось определить задачи для связи");
        return;
      }

      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "blocks",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: "var(--primary)",
        },
        style: {
          stroke: "var(--primary)",
          strokeLinecap: "round",
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));

      try {
        await tasksApi.createDependency(slug, sourceTaskId, {
          target_task_id: targetTaskId,
          dependency_type: "blocks",
        });
        toast.success("Зависимость добавлена");
        mutate();
      } catch (err: unknown) {
        setEdges((eds) => eds.filter((e) => e.id !== newEdge.id));
        const detail =
          err instanceof ApiError
            ? err.detail
            : "Ошибка: возможен цикл зависимостей";
        toast.error(detail);
      }
    },
    [slug, setEdges, mutate, nodes],
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedTask(node.data);
  }, []);

  // Handle delete key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTask
      ) {
        event.preventDefault();
        event.stopPropagation();
        const selectedNode = nodes.find(
          (n) => n.id === String(selectedTask.id),
        );
        if (selectedNode) {
          setNodeToDelete(selectedNode);
          setShowDeleteDialog(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask, nodes]);

  if (graphLoading && !graphData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[calc(100vh-4rem)] bg-muted/20">
        <Loader2 className="h-9 w-9 animate-spin text-primary/70" />
        <p className="text-sm text-muted-foreground">Загрузка графа…</p>
      </div>
    );
  }

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    try {
      const taskId = (nodeToDelete.data as { id: number }).id;
      await tasksApi.delete(slug, taskId);
      toast.success("Задача удалена");
      setShowDeleteDialog(false);
      setNodeToDelete(null);
      setSelectedTask(null);
      mutate();
    } catch (err: any) {
      toast.error(err.detail || "Ошибка удаления");
    }
  };
  return (
    <div className="h-[calc(100vh-4rem)] relative bg-gradient-to-b from-muted/30 via-background to-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onMoveEnd={(_, v) => setViewport(v)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.35 }}
        minZoom={0.15}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{
          stroke: "var(--primary)",
          strokeWidth: 2,
          strokeLinecap: "round",
        }}
        className="[&_.react-flow__edge-path]:stroke-linecap-round"
        deleteKeyCode={["Backspace", "Delete"]}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.15}
          color="hsl(var(--muted-foreground) / 0.18)"
          className="[&>*]:opacity-100"
        />
        <Controls
          showInteractive={false}
          className="!m-3 !rounded-xl !border !border-border/60 !bg-card/95 !shadow-lg !backdrop-blur-sm [&_button]:!rounded-lg [&_button]:!border-0 [&_button:hover]:!bg-muted"
        />
        <MiniMap
          nodeStrokeWidth={2}
          zoomable
          pannable
          maskColor="hsl(var(--background) / 0.88)"
          className="!m-3 !rounded-xl !border !border-border/60 !bg-card/90 !shadow-lg !backdrop-blur-sm [&_.react-flow__minimap-mask]:opacity-90"
          nodeColor={(n) => {
            const c = (n.data as { status_color?: string })?.status_color;
            return c ?? "hsl(var(--muted))";
          }}
        />
        <Panel position="top-left" className="m-3 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border/60 bg-card/90 p-1.5 shadow-lg backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl"
              onClick={() => router.push(`/projects/${slug}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button
              size="sm"
              className="rounded-xl gap-1 shadow-sm"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-4 w-4" />
              Задача
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1"
              onClick={() => mutate()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-fit min-w-[11rem] rounded-2xl border border-border/60 bg-card/90 p-3 shadow-lg backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Сетка
            </p>
            <Button
              variant={snapToGrid ? "default" : "outline"}
              size="sm"
              className="w-full rounded-xl text-xs h-8"
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-2" />
              {snapToGrid ? "Привязка к сетке" : "Свободное позиционирование"}
            </Button>
          </div>
        </Panel>

        <Panel
          position="bottom-right"
          className="m-3 rounded-2xl border border-border/60 bg-card/90 px-4 py-3 text-[11px] text-muted-foreground shadow-lg backdrop-blur-md"
        >
          <p className="font-semibold text-foreground mb-2 text-xs">Легенда</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]" />
              <span>Готова к работе</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <span>В работе / связь</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectSlug={slug}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => mutate()}
        />
      )}

      <CreateTaskDialog
        projectSlug={slug}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={() => {
          mutate();

          setShowCreate(false);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задача "{nodeToDelete?.data.name}"
              будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>

            <AlertDialogAction onClick={handleDeleteNode}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
