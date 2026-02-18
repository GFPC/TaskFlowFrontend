"use client"

import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import { useCallback, useEffect, useMemo, useState } from "react"
import ReactFlow, {
  Background,
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
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
} from "reactflow"
import "reactflow/dist/style.css"
import { tasks as tasksApi, type GraphData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Loader2, Save, Filter, RefreshCw, LayoutGrid } from "lucide-react"
import { TaskNode } from "@/components/graph/task-node"
import { DependencyEdge } from "@/components/graph/dependency-edge"
import { TaskDetailDialog } from "@/components/graph/task-detail-dialog"
import { CreateTaskDialog } from "@/components/graph/create-task-dialog"
import { toast } from "sonner"
import { debounce } from "lodash"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const { data: graphData, mutate, isLoading: graphLoading } = useSWR(`graph-${slug}`, () =>
    tasksApi.graph(slug)
  )

  const [nodes, setNodes, onNodesChangeState] = useNodesState([])
  const [edges, setEdges, onEdgesChangeState] = useEdgesState([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (graphData) {
      setNodes(graphToNodes(graphData))
      setEdges(graphToEdges(graphData))
    }
  }, [graphData, setNodes, setEdges])

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeState(changes)
      const hasRemove = changes.some(c => c.type === 'remove')
      if (hasRemove) {
        changes.forEach(async (c) => {
          if (c.type === 'remove') {
            try {
              const edge = edges.find(e => e.id === c.id)
              if (edge) {
                const depId = Number(edge.id.replace('e', ''))
                if (!isNaN(depId)) {
                  await tasksApi.deleteDependency(slug, depId)
                  toast.success("Связь удалена")
                }
              }
            } catch (err: any) {
              toast.error(err.detail || "Ошибка удаления связи")
              mutate()
            }
          }
        })
      }
    },
    [onEdgesChangeState, edges, slug, mutate]
  )

  // Debounced auto-save for positions
  const debouncedSave = useMemo(
    () => debounce(async (nds: Node[]) => {
      const updatedGraph: GraphData = {
        nodes: nds.map((n) => ({
          id: Number(n.id),
          type: n.type || "taskNode",
          data: n.data as any,
          position: n.position,
        })),
        edges: edges.map((e) => ({
          id: Number(e.id.replace('e', '')),
          source: Number(e.source),
          target: Number(e.target),
          animated: e.animated,
          label: typeof e.label === "string" ? e.label : undefined,
          data: e.data as any
        })),
      }
      try {
        await tasksApi.saveGraph(slug, updatedGraph)
        toast.success("Позиции сохранены", { duration: 1000 })
      } catch {
        toast.error("Ошибка автосохранения")
      }
    }, 1000),
    [slug, edges]
  )

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeState(changes)
      const hasPosChange = changes.some(c => c.type === 'position' && (c as any).dragging === false)
      if (hasPosChange) {
        setNodes((nds) => {
          debouncedSave(nds)
          return nds
        })
      }
    },
    [onNodesChangeState, debouncedSave, setNodes]
  )

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return
      
      // Optimistic update
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "dependency",
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "hsl(var(--primary))" },
      }
      
      setEdges((eds) => addEdge(newEdge, eds))

      try {
        await tasksApi.createDependency(slug, Number(connection.source), {
          target_task_id: Number(connection.target),
          dependency_type: "blocks",
        })
        toast.success("Зависимость добавлена")
        mutate()
      } catch (err: any) {
        setEdges((eds) => eds.filter(e => e.id !== newEdge.id))
        toast.error(err.detail || "Ошибка: возможен цикл зависимостей")
      }
    },
    [slug, setEdges, mutate]
  )

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedTask(node.data)
  }, [])

  if (graphLoading && !graphData) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        className="bg-background"
        onlyRenderVisible={true}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Panel position="top-left" className="flex flex-col gap-2">
          <div className="flex gap-2 bg-background/80 backdrop-blur p-1 rounded-lg border shadow-sm">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${slug}`)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Назад
            </Button>
            <Separator orientation="vertical" className="h-8" />
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Задача
            </Button>
            <Button variant="outline" size="sm" onClick={() => mutate()} className="gap-1">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-1 bg-background/80 backdrop-blur p-2 rounded-lg border shadow-sm w-48">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1 px-1">Инструменты</p>
            <div className="grid grid-cols-2 gap-1">
              <Button variant="outline" size="xs" className="text-[10px] h-7 px-1">
                <LayoutGrid className="h-3 w-3 mr-1" /> Автосетка
              </Button>
              <Button variant="outline" size="xs" className="text-[10px] h-7 px-1">
                <Filter className="h-3 w-3 mr-1" /> Фильтр
              </Button>
            </div>
          </div>
        </Panel>
        
        <Panel position="bottom-right" className="bg-background/80 backdrop-blur p-2 rounded-lg border text-[10px] text-muted-foreground">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Готова к работе</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>В процессе</span>
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
          mutate()
          setShowCreate(false)
        }}
      />
    </div>
  )
}

const nodeTypes = { taskNode: TaskNode }
const edgeTypes = { dependency: DependencyEdge }

function graphToNodes(graphData: GraphData): Node[] {
  return graphData.nodes.map((n) => ({
    id: String(n.id),
    type: "taskNode",
    position: n.position,
    data: n.data,
  }))
}

function graphToEdges(graphData: GraphData): Edge[] {
  return graphData.edges.map((e) => ({
    id: String(e.id),
    source: String(e.source),
    target: String(e.target),
    type: "dependency",
    animated: e.animated ?? true,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { actions: e.data?.actions ?? [] },
    style: { stroke: "hsl(var(--primary))" },
  }))
}
