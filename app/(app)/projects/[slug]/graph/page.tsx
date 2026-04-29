"use client";

import { useParams, useRouter } from "next/navigation";

import useSWR from "swr";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

import {
  tasks as tasksApi,
  formatApiError,
  meta as metaApi,
  projects as projectsApi,
  type DependencyAction,
  type GraphData,
  type ProjectDetail,
} from "@/lib/api";

import { Button } from "@/components/ui/button";

import { ArrowLeft, Plus, Loader2, RefreshCw, LayoutGrid } from "lucide-react";

import { TaskNode } from "@/components/graph/task-node";

import { DependencyEdge } from "@/components/graph/dependency-edge";

import { TaskDetailDialog } from "@/components/graph/task-detail-dialog";

import { CreateTaskDialog } from "@/components/graph/create-task-dialog";

import { toast } from "sonner";

import { debounce } from "lodash";

import { useAuth } from "@/lib/auth-context";
import {
  canCreateTasksInProject,
  canDeleteTask,
  canManageTaskGraph,
} from "@/lib/project-permissions";

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

function coerceGraphEdgeActions(raw: unknown): DependencyAction[] {
  if (!Array.isArray(raw)) return [];
  const out: DependencyAction[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.action_type_code === "string") {
      out.push({
        id: typeof o.id === "number" ? o.id : -(i + 1),
        action_type_code: o.action_type_code,
        target_user_username:
          typeof o.target_user_username === "string"
            ? o.target_user_username
            : undefined,
        target_status:
          typeof o.target_status === "string" ? o.target_status : undefined,
        message_template:
          typeof o.message_template === "string"
            ? o.message_template
            : undefined,
        delay_minutes:
          typeof o.delay_minutes === "number" ? o.delay_minutes : undefined,
        execute_order:
          typeof o.execute_order === "number" ? o.execute_order : undefined,
      });
      continue;
    }
    if (typeof o.type === "string") {
      out.push({
        id: typeof o.id === "number" ? o.id : -(i + 1),
        action_type_code: o.type,
        delay_minutes: typeof o.delay === "number" ? o.delay : undefined,
      });
    }
  }
  return out;
}

function edgeStrokeForType(t: string | undefined): string {
  if (t === "blocks") return "var(--destructive)";
  if (t === "simple") return "var(--muted-foreground)";
  return "var(--primary)";
}

function edgeDashForType(t: string | undefined): string | undefined {
  return t === "simple" ? "6 4" : undefined;
}

function graphToNodes(graphData: GraphData): Node[] {
  return graphData.nodes.map((n) => ({
    id: String(n.id),
    type: "taskNode",
    position: n.position,
    data: n.data,
  }));
}

function normalizeEdgeType(t: string | undefined): keyof typeof edgeTypes {
  if (t === "blocks" || t === "simple" || t === "dependency") return t;
  return "dependency";
}

function graphToEdges(graphData: GraphData): Edge[] {
  return graphData.edges.map((e) => {
    const edgeType = normalizeEdgeType(e.type);
    const stroke = edgeStrokeForType(edgeType);
    const strokeDasharray = edgeDashForType(edgeType);
    return {
      id: String(e.id),
      source: String(e.source),
      target: String(e.target),
      type: edgeType,
      animated: e.animated ?? true,
      label: e.label,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: stroke,
      },
      data: {
        dependency_id: e.data?.dependency_id,
        description: e.data?.description,
        actions: coerceGraphEdgeActions(e.data?.actions),
      },
      style: {
        stroke,
        strokeLinecap: "round",
        ...(strokeDasharray ? { strokeDasharray } : {}),
      },
    };
  });
}

export default function GraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user } = useAuth();

  /** Ключ совпадает со страницей проекта — общий кэш; username ловит смену аккаунта. */
  const swrIdentity = user?.username ?? "__";

  const { data: project } = useSWR<ProjectDetail>(
    slug ? (["project", slug, swrIdentity] as const) : null,
    () => projectsApi.get(slug),
    { dedupingInterval: 60_000 },
  );
  const userRole = project?.user_role;
  const canManageGraph = canManageTaskGraph(userRole);
  const canCreateTask =
    !!project?.can_create_tasks && canCreateTasksInProject(userRole);

  const canManageGraphRef = useRef(canManageGraph);
  canManageGraphRef.current = canManageGraph;

  const {
    data: graphData,
    mutate,
    isLoading: graphLoading,
  } = useSWR(`graph-${slug}`, () => tasksApi.graph(slug), {
    dedupingInterval: 30_000,
  });

  const { data: graphMeta } = useSWR("task-graph-meta", () => metaApi.taskGraph(), {
    dedupingInterval: 600_000,
    revalidateOnFocus: false,
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
      if (!canManageGraphRef.current) {
        const hasRemove = changes.some((c) => c.type === "remove");
        if (hasRemove) {
          toast.error(
            "Удалять связи на графе могут только владелец и менеджер проекта.",
          );
        }
        const filtered = changes.filter((c) => c.type !== "remove");
        if (filtered.length === 0) return;
        onEdgesChangeState(filtered);
        return;
      }
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
            const msg = formatApiError(err);
            toast.error(msg);
            void mutate();
          }
        })();
      }
    },
    [onEdgesChangeState, edges, slug, mutate],
  );

  const buildGraphPayload = useCallback(
    (
      nds: Node[],
      eds: Edge[],
      vp: { x: number; y: number; zoom: number },
    ): GraphData => ({
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
    }),
    [],
  );

  const debouncedSaveLayout = useMemo(
    () =>
      debounce((nds: Node[], eds: Edge[], vp: typeof viewport) => {
        if (!canManageGraphRef.current) return;
        const updatedGraph = buildGraphPayload(nds, eds, vp);
        void tasksApi.saveGraph(slug, updatedGraph).catch(() => {});
      }, 500),
    [slug, buildGraphPayload],
  );

  const debouncedSaveView = useMemo(
    () =>
      debounce((nds: Node[], eds: Edge[], vp: typeof viewport) => {
        if (!canManageGraphRef.current) return;
        const updatedGraph = buildGraphPayload(nds, eds, vp);
        void tasksApi.saveGraph(slug, updatedGraph).catch(() => {});
      }, 700),
    [slug, buildGraphPayload],
  );

  useEffect(
    () => () => {
      debouncedSaveLayout.cancel();
      debouncedSaveView.cancel();
    },
    [debouncedSaveLayout, debouncedSaveView],
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
          debouncedSaveLayout(nds, edges, viewport);
          return nds;
        });
      }
    },
    [onNodesChangeState, debouncedSaveLayout, setNodes, edges, viewport],
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!canManageGraphRef.current) {
        toast.error(
          "Связи на графе настраивают только владелец и менеджер проекта.",
        );
        return;
      }
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceTaskId = (sourceNode?.data as { id?: number } | undefined)
        ?.id;
      const targetTaskId = (targetNode?.data as { id?: number } | undefined)
        ?.id;
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
          color: "var(--destructive)",
        },
        style: {
          stroke: "var(--destructive)",
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
        toast.error(formatApiError(err));
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
        selectedTask &&
        project &&
        canDeleteTask(
          project.user_role,
          {
            creator_username:
              (selectedTask as { creator_username?: string }).creator_username,
          },
          user?.username,
        )
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
  }, [selectedTask, nodes, project, user?.username]);

  if (graphLoading && !graphData) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-[calc(100vh-4rem)] bg-muted/20">
        <Loader2 className="h-9 w-9 animate-spin text-primary/70" />
        <p className="text-sm text-muted-foreground">Загрузка графа…</p>
      </div>
    );
  }

  const handleDeleteNode = async () => {
    if (!nodeToDelete || !project) return;
    const taskData = nodeToDelete.data as {
      id: number;
      creator_username?: string;
    };
    if (
      !canDeleteTask(
        project.user_role,
        { creator_username: taskData.creator_username },
        user?.username,
      )
    ) {
      toast.error("Удалять задачи могут только владелец и менеджер проекта.");
      setShowDeleteDialog(false);
      setNodeToDelete(null);
      return;
    }
    try {
      const taskId = taskData.id;
      await tasksApi.delete(slug, taskId);
      toast.success("Задача удалена");
      setShowDeleteDialog(false);
      setNodeToDelete(null);
      setSelectedTask(null);
      mutate();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
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
        onMoveEnd={(_, v) => {
          setViewport(v);
          debouncedSaveView(nodes, edges, v);
        }}
        nodesDraggable={canManageGraph}
        nodesConnectable={canManageGraph}
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
        deleteKeyCode={canManageGraph ? ["Backspace", "Delete"] : null}
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
            {canCreateTask ? (
              <Button
                size="sm"
                className="rounded-xl gap-1 shadow-sm"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4" />
                Задача
              </Button>
            ) : null}
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
          position="top-right"
          className="m-3 max-h-[min(420px,70vh)] max-w-[15rem] overflow-y-auto rounded-2xl border border-border/60 bg-card/90 px-4 py-3 text-[11px] text-muted-foreground shadow-lg backdrop-blur-md"
        >
          <p className="font-semibold text-foreground mb-2 text-xs">Легенда</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success)/0.5)]" />
              <span>Готова к работе</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/90" />
              <span>Ожидает / в работе</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
              Тип связи
            </p>
            {graphMeta?.dependency_types &&
            graphMeta.dependency_types.length > 0 ? (
              graphMeta.dependency_types.map((dt) => (
                <div key={dt.code} className="flex items-center gap-2.5">
                  <span
                    className="h-0.5 w-7 shrink-0 rounded-full"
                    style={{
                      background:
                        dt.code === "blocks"
                          ? "var(--destructive)"
                          : dt.code === "simple"
                            ? "var(--muted-foreground)"
                            : "var(--primary)",
                    }}
                  />
                  <span className="leading-tight">
                    {dt.display_name ?? dt.label ?? dt.code}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="h-0.5 w-7 shrink-0 rounded-full bg-destructive" />
                  <span>Блокирует</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-0.5 w-7 shrink-0 rounded-full"
                    style={{ background: "var(--muted-foreground)" }}
                  />
                  <span>Слабая связь</span>
                </div>
              </>
            )}
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
          onOpenRelatedTask={(taskId) => {
            const node = nodes.find(
              (n) => (n.data as { id?: number }).id === taskId,
            );
            if (node) {
              setSelectedTask(node.data);
              return;
            }
            void tasksApi
              .get(slug, taskId)
              .then((d) => {
                setSelectedTask(d);
              })
              .catch(() => {
                toast.error("Не удалось загрузить задачу");
              });
          }}
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
