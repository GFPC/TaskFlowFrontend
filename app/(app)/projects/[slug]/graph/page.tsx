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

import {
  ArrowLeft,
  Plus,
  Loader2,
  RefreshCw,
  LayoutGrid,
  Target,
  GitBranch,
} from "lucide-react";

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

type BlockEdgeState = "blocked" | "unblocked";
type GraphEdgeData = NonNullable<GraphData["edges"][number]["data"]>;
type GraphTaskData = GraphData["nodes"][number]["data"];

const LAYER_X_GAP = 320;
const LAYER_Y_GAP = 180;

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

function edgeStrokeForType(
  t: string | undefined,
  state?: BlockEdgeState,
): string {
  if (state === "unblocked") return "var(--success)";
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

function getBlockEdgeState(
  edgeType: keyof typeof edgeTypes,
  sourceTaskData?: { status?: string },
): BlockEdgeState | undefined {
  if (edgeType !== "blocks") return undefined;
  return sourceTaskData?.status === "completed" ? "unblocked" : "blocked";
}

function blockEdgeStateLabel(state?: BlockEdgeState): string | undefined {
  if (state === "unblocked") return "разблокировано";
  if (state === "blocked") return "заблокировано";
  return undefined;
}

function taskName(task?: GraphTaskData): string {
  return task?.name?.trim() || "задача";
}

function blockEdgeStateReason(
  state: BlockEdgeState | undefined,
  sourceTask?: GraphTaskData,
  targetTask?: GraphTaskData,
): string | undefined {
  if (state === "unblocked") {
    return `«${taskName(sourceTask)}» выполнена. Связь больше не блокирует «${taskName(targetTask)}».`;
  }
  if (state === "blocked") {
    return `«${taskName(targetTask)}» ждет завершения «${taskName(sourceTask)}».`;
  }
  return undefined;
}

function isNextActionTask(data?: { status?: string; is_ready?: boolean }) {
  return data?.status === "todo" && data.is_ready === true;
}

function autoLayoutNodes(nds: Node[], eds: Edge[]): Node[] {
  const nodeIds = new Set(nds.map((n) => n.id));
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const node of nds) {
    incoming.set(node.id, []);
    outgoing.set(node.id, []);
  }

  for (const edge of eds) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  }

  const layerById = new Map<string, number>();
  const visiting = new Set<string>();

  const resolveLayer = (id: string): number => {
    const cached = layerById.get(id);
    if (cached != null) return cached;
    if (visiting.has(id)) return 0;

    visiting.add(id);
    const parents = incoming.get(id) ?? [];
    const layer =
      parents.length === 0
        ? 0
        : Math.max(...parents.map((parentId) => resolveLayer(parentId))) + 1;
    visiting.delete(id);
    layerById.set(id, layer);
    return layer;
  };

  for (const node of nds) resolveLayer(node.id);

  const groups = new Map<number, Node[]>();
  for (const node of nds) {
    const layer = layerById.get(node.id) ?? 0;
    groups.set(layer, [...(groups.get(layer) ?? []), node]);
  }

  const sortedLayers = [...groups.keys()].sort((a, b) => a - b);
  const maxGroupSize = Math.max(...[...groups.values()].map((g) => g.length), 1);
  const centerOffset = ((maxGroupSize - 1) * LAYER_Y_GAP) / 2;

  return sortedLayers.flatMap((layer) => {
    const group = [...(groups.get(layer) ?? [])].sort((a, b) => {
      const priorityA = ((a.data as { priority?: number })?.priority ?? 0) * -1;
      const priorityB = ((b.data as { priority?: number })?.priority ?? 0) * -1;
      return (
        priorityA - priorityB ||
        String((a.data as { name?: string })?.name ?? "").localeCompare(
          String((b.data as { name?: string })?.name ?? ""),
          "ru",
        )
      );
    });

    const localOffset = ((group.length - 1) * LAYER_Y_GAP) / 2;
    return group.map((node, index) => ({
      ...node,
      position: {
        x: layer * LAYER_X_GAP,
        y: index * LAYER_Y_GAP + centerOffset - localOffset,
      },
    }));
  });
}

function serializeGraphEdgeData(data: unknown): GraphEdgeData {
  const edgeData = data as GraphEdgeData | undefined;
  return {
    dependency_id: edgeData?.dependency_id,
    description: edgeData?.description,
    actions: edgeData?.actions,
  };
}

function graphToEdges(graphData: GraphData): Edge[] {
  const nodesById = new Map(graphData.nodes.map((n) => [String(n.id), n]));

  return graphData.edges.map((e) => {
    const edgeType = normalizeEdgeType(e.type);
    const state = getBlockEdgeState(
      edgeType,
      nodesById.get(String(e.source))?.data,
    );
    const sourceTask = nodesById.get(String(e.source))?.data;
    const targetTask = nodesById.get(String(e.target))?.data;
    const stroke = edgeStrokeForType(edgeType, state);
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
        state,
        stateLabel: blockEdgeStateLabel(state),
        stateReason: blockEdgeStateReason(state, sourceTask, targetTask),
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

  const { data: graphMeta } = useSWR(
    "task-graph-meta",
    () => metaApi.taskGraph(),
    {
      dedupingInterval: 600_000,
      revalidateOnFocus: false,
    },
  );

  const [nodes, setNodes, onNodesChangeState] = useNodesState([]);

  const [edges, setEdges, onEdgesChangeState] = useEdgesState([]);

  const [selectedTask, setSelectedTask] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showNextActions, setShowNextActions] = useState(false);

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
        data: serializeGraphEdgeData(e.data),
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

  const nextActionCount = useMemo(
    () => nodes.filter((n) => isNextActionTask(n.data as GraphTaskData)).length,
    [nodes],
  );

  const displayNodes = useMemo(
    () =>
      showNextActions
        ? nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              focusMode: "next-actions",
              is_next_action: isNextActionTask(node.data as GraphTaskData),
            },
          }))
        : nodes,
    [nodes, showNextActions],
  );

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const layoutedNodes = autoLayoutNodes(nodes, edges);
    setNodes(layoutedNodes);

    if (canManageGraphRef.current) {
      void tasksApi
        .saveGraph(slug, buildGraphPayload(layoutedNodes, edges, viewport))
        .catch(() => {
          toast.error("Не удалось сохранить авто-раскладку");
        });
    }

    toast.success("Граф разложен по слоям зависимостей");
  }, [nodes, edges, setNodes, slug, buildGraphPayload, viewport]);

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

      const state = getBlockEdgeState(
        "blocks",
        sourceNode?.data as { status?: string } | undefined,
      );
      const stroke = edgeStrokeForType("blocks", state);
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
          color: stroke,
        },
        data: {
          state,
          stateLabel: blockEdgeStateLabel(state),
          stateReason: blockEdgeStateReason(
            state,
            sourceNode?.data as GraphTaskData | undefined,
            targetNode?.data as GraphTaskData | undefined,
          ),
        },
        label: undefined,
        style: {
          stroke,
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
        event.key === "Delete" &&
        selectedTask &&
        project &&
        canDeleteTask(
          project.user_role,
          {
            creator_username: (selectedTask as { creator_username?: string })
              .creator_username,
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
        nodes={displayNodes}
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
        deleteKeyCode={canManageGraph ? ["Delete"] : null}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.15}
          color="var(--muted-foreground)"
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
          </div>

          <div className="w-fit min-w-[11rem] rounded-2xl border border-border/60 bg-card/90 p-3 shadow-lg backdrop-blur-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Фокус
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant={showNextActions ? "default" : "outline"}
                size="sm"
                className="w-full justify-start rounded-xl text-xs h-8"
                onClick={() => setShowNextActions((v) => !v)}
              >
                <Target className="h-3.5 w-3.5 mr-2" />
                Следующие: {nextActionCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start rounded-xl text-xs h-8"
                onClick={handleAutoLayout}
              >
                <GitBranch className="h-3.5 w-3.5 mr-2" />
                Авто-слои
              </Button>
            </div>
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
              <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-success bg-success/10" />
              <span>Следующее действие</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary/90" />
              <span>Ожидает / в работе</span>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pt-1">
              Состояние связи
            </p>
            <div className="flex items-center gap-2.5">
              <span className="h-0.5 w-7 shrink-0 rounded-full bg-success" />
              <span>Разблокировано</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-0.5 w-7 shrink-0 rounded-full bg-destructive" />
              <span>Заблокировано</span>
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
