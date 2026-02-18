"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "reactflow";
import { Bell, User, Clock, RefreshCw, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { tasks as tasksApi } from "@/lib/api";
import { toast } from "sonner";
import { useParams } from "next/navigation";

interface Action {
  id: number;
  type: 'notify_assignee' | 'notify_creator' | 'notify_custom' | 'change_status';
  delay: number;
}

type DependencyEdgeData = {
  actions?: Action[];
};

function DependencyEdgeComponent({
  id,
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
}: EdgeProps<DependencyEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { slug } = useParams() as { slug: string };
  const actions = data?.actions ?? [];
  const [newActionType, setNewActionType] = useState<string>("notify_assignee");
  const [newActionDelay, setNewActionDelay] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  const handleAddAction = async () => {
    setLoading(true);
    try {
      const depId = Number(id.replace('e', ''));
      await tasksApi.addAction(slug, depId, {
        action_type_code: newActionType,
        delay_minutes: Number(newActionDelay),
      });
      toast.success("Действие добавлено");
    } catch (err: any) {
      toast.error(err.detail || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAction = async (actionId: number) => {
    try {
      await tasksApi.deleteAction(slug, actionId);
      toast.success("Действие удалено");
    } catch (err: any) {
      toast.error(err.detail || "Ошибка");
    }
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? 'hsl(var(--primary))' : style.stroke,
          opacity: selected ? 1 : 0.6,
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "flex items-center gap-1 bg-background border rounded-full px-2 py-1 shadow-sm hover:scale-110 transition-transform",
                actions.length > 0 && "border-primary/50 bg-primary/5"
              )}>
                {actions.length > 0 ? (
                  <div className="flex -space-x-1 items-center">
                    {actions.map((action: any) => (
                      <div key={action.id} className="bg-background rounded-full p-0.5 border border-primary/20 shadow-sm">
                        {action.type === 'notify_assignee' && <Bell className="h-3 w-3 text-primary" />}
                        {action.type === 'notify_creator' && <User className="h-3 w-3 text-blue-500" />}
                        {action.type === 'notify_custom' && <Clock className="h-3 w-3 text-orange-500" />}
                        {action.type === 'change_status' && <RefreshCw className="h-3 w-3 text-green-500" />}
                      </div>
                    ))}
                    <span className="ml-1 text-[10px] font-bold text-primary">{actions.length}</span>
                  </div>
                ) : (
                  <Plus className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="top">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Действия при выполнении</h4>
                  {actions.length > 0 && <Badge variant="secondary" className="text-[10px]">{actions.length}</Badge>}
                </div>
                {actions.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-2 bg-muted/30 rounded">Нет действий</p>
                )}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {actions.map((action: any) => (
                    <div key={action.id} className="flex items-center justify-between bg-muted/50 p-2 rounded text-xs group">
                      <div className="flex items-center gap-2">
                        {action.type === 'notify_assignee' && <Bell className="h-3.5 w-3.5 text-primary" />}
                        {action.type === 'notify_creator' && <User className="h-3.5 w-3.5 text-blue-500" />}
                        {action.type === 'notify_custom' && <Clock className="h-3.5 w-3.5 text-orange-500" />}
                        {action.type === 'change_status' && <RefreshCw className="h-3.5 w-3.5 text-green-500" />}
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {action.type === 'notify_assignee' && "Исполнителю"}
                            {action.type === 'notify_creator' && "Создателю"}
                            {action.type === 'notify_custom' && "Уведомление"}
                            {action.type === 'change_status' && "Статус"}
                          </span>
                          {action.delay > 0 && <span className="text-[9px] opacity-70">через {action.delay}м</span>}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAction(action.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-[10px] uppercase text-muted-foreground">Добавить действие</Label>
                  <Select value={newActionType} onValueChange={setNewActionType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notify_assignee">Уведомить исполнителя</SelectItem>
                      <SelectItem value="notify_creator">Уведомить создателя</SelectItem>
                      <SelectItem value="change_status">Сменить статус</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Задержка (мин)</Label>
                      <Input 
                        type="number" 
                        value={newActionDelay} 
                        onChange={(e) => setNewActionDelay(e.target.value)} 
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button size="sm" className="h-8" onClick={handleAddAction} disabled={loading}>
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
