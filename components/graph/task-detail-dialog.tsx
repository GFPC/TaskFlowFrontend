"use client";

import { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  tasks as tasksApi,
  projects as projectsApi,
  ApiError,
  type Task,
  type TaskDetail,
} from "@/lib/api";
import type { ProjectMember } from "@/lib/api";
import {
  canAssignProjectTasks,
  canEditTaskFieldsAdmin,
  canEditTaskDescription,
  canChangeTaskStatus,
  isProjectObserver,
  canDeleteTask,
} from "@/lib/project-permissions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Trash2, Save, Play, CheckCircle2, Loader2 } from "lucide-react";

const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Выполнена",
  blocked: "Заблокирована",
};

const priorityLabels: Record<number, string> = {
  0: "Низкий",
  1: "Средний",
  2: "Высокий",
};

const ASSIGNEE_NONE = "__none__";

interface Props {
  task: any;
  projectSlug: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

function getAssigneeKey(t: { assignee_username?: string; assignee?: string }): string {
  return String(t.assignee_username ?? t.assignee ?? "").trim();
}

function toDatetimeLocal(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskDetailDialog({
  task,
  projectSlug,
  open,
  onClose,
  onUpdate,
}: Props) {
  const { user } = useAuth();

  const [resolved, setResolved] = useState<Task | TaskDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [name, setName] = useState(task.name);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(String(task.priority ?? 0));
  const [description, setDescription] = useState(task.description ?? "");
  const [deadline, setDeadline] = useState(toDatetimeLocal(task.deadline));
  const [assigneeUsername, setAssigneeUsername] = useState(getAssigneeKey(task));

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [projectRole, setProjectRole] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const base = resolved ?? task;

  useEffect(() => {
    if (!open || !projectSlug || !task?.id) return;
    setLoadingDetail(true);
    tasksApi
      .get(projectSlug, task.id)
      .then((d) => setResolved(d))
      .catch(() => setResolved(null))
      .finally(() => setLoadingDetail(false));
  }, [open, projectSlug, task?.id]);

  useEffect(() => {
    if (!open || !projectSlug) return;
    projectsApi
      .get(projectSlug)
      .then((p) => {
        setMembers(p.members.filter((m) => m.is_active));
        setProjectRole(p.user_role);
      })
      .catch(() => {
        setMembers([]);
        setProjectRole(undefined);
      });
  }, [open, projectSlug]);

  useEffect(() => {
    if (!open) return;
    const t = resolved ?? task;
    setName(t.name);
    setStatus(t.status);
    setPriority(String(t.priority ?? 0));
    setDescription((t as Task).description ?? "");
    setDeadline(toDatetimeLocal((t as Task).deadline));
    setAssigneeUsername(getAssigneeKey(t));
  }, [open, resolved, task]);

  const canAssign = canAssignProjectTasks(projectRole);
  const canAdminFields = canEditTaskFieldsAdmin(projectRole);
  const canDesc = canEditTaskDescription(projectRole);
  const canStatus = canChangeTaskStatus(projectRole);
  const observer = isProjectObserver(projectRole);

  const creatorUsername =
    (base as Task).creator_username ?? (base as { creator?: string }).creator;

  const deleteAllowed = canDeleteTask(
    projectRole,
    { creator_username: creatorUsername },
    user?.username,
  );

  async function handleSave(statusOverride?: string) {
    if (observer) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const orig = (resolved ?? task) as Task;
      const statusToUse = statusOverride ?? status;
      const payload: Record<string, unknown> = {};

      if (canAdminFields) {
        if (name.trim() !== orig.name) payload.name = name.trim();
        if (Number(priority) !== orig.priority)
          payload.priority = Number(priority);
        const prevDl = toDatetimeLocal(orig.deadline);
        if (deadline !== prevDl) {
          payload.deadline = deadline
            ? new Date(deadline).toISOString()
            : undefined;
        }
      }

      if (canAssign) {
        const prev = getAssigneeKey(orig);
        const next = assigneeUsername.trim();
        if (next !== prev) payload.assignee_username = next || undefined;
      }

      if (canDesc) {
        const next = description.trim();
        const prev = (orig.description ?? "").trim();
        if (next !== prev) payload.description = next || undefined;
      }

      if (Object.keys(payload).length > 0) {
        await tasksApi.update(projectSlug, task.id, payload);
      }
      if (canStatus && statusToUse !== orig.status) {
        await tasksApi.changeStatus(projectSlug, task.id, statusToUse);
      }
      toast.success("Задача обновлена");
      onUpdate();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError ? err.detail : "Ошибка обновления";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    try {
      await tasksApi.delete(projectSlug, task.id);
      toast.success("Задача удалена");
      onUpdate();
      onClose();
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setShowDeleteDialog(false);
    }
  }

  const assigneeReadonly = getAssigneeKey(base as Task) || "—";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Задача #{task.id}
            <Badge variant="outline">
              {priorityLabels[(base as Task).priority ?? 0] ?? "Средний"}
            </Badge>
          </DialogTitle>
          {observer && (
            <DialogDescription>Только просмотр</DialogDescription>
          )}
        </DialogHeader>

        {loadingDetail && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка данных задачи…
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            {canAdminFields ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : (
              <p className="text-sm font-medium pt-2">{name}</p>
            )}
            {!canAdminFields && !observer && (
              <p className="text-xs text-muted-foreground mt-1">
                Название меняют владелец и менеджер.
              </p>
            )}
          </div>

          <div>
            <Label>Описание</Label>
            {canDesc ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Описание задачи"
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pt-2">
                {(base as Task).description?.trim() ? (
                  (base as Task).description
                ) : (
                  <span className="italic">Нет описания</span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Статус</Label>
              {canStatus ? (
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm pt-2">
                  {statusLabels[status] ?? status}
                </p>
              )}
            </div>
            <div>
              <Label>Приоритет</Label>
              {canAdminFields ? (
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={String(k)}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm pt-2">
                  {priorityLabels[Number(priority)] ?? priority}
                </p>
              )}
            </div>
          </div>

          {canAdminFields && (
            <div>
              <Label>Дедлайн</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          )}

          {!canAdminFields && (base as Task).deadline && (
            <div>
              <Label>Дедлайн</Label>
              <p className="text-sm text-muted-foreground pt-1">
                {new Date((base as Task).deadline!).toLocaleString("ru")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Менять дедлайн могут владелец и менеджер.
              </p>
            </div>
          )}

          <div>
            <Label>Исполнитель</Label>
            {canAssign ? (
              <Select
                value={assigneeUsername ? assigneeUsername : ASSIGNEE_NONE}
                onValueChange={(v) =>
                  setAssigneeUsername(v === ASSIGNEE_NONE ? "" : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ASSIGNEE_NONE}>Не назначен</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.username}>
                      {m.first_name} {m.last_name} (@{m.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <p className="text-sm text-muted-foreground pt-2">
                  {assigneeReadonly}
                </p>
                {!observer && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Назначает владелец или менеджер.
                  </p>
                )}
              </>
            )}
          </div>

          <Separator />

          {!observer && canStatus && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {base.status === "todo" && (base as Task).is_ready && (
                  <Button
                    type="button"
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => void handleSave("in_progress")}
                  >
                    <Play className="h-4 w-4 mr-2" /> Начать работу
                  </Button>
                )}
                {base.status !== "completed" && (
                  <Button
                    type="button"
                    className="flex-1"
                    variant="outline"
                    onClick={() => void handleSave("completed")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Завершить
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {observer ? (
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                Закрыть
              </Button>
            </DialogFooter>
          ) : (
            <div className="flex justify-between gap-2 flex-wrap">
              {deleteAllowed ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Удалить
                </Button>
              ) : (
                <span />
              )}

              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Сохранить
              </Button>
            </div>
          )}

          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие нельзя отменить. Задача будет удалена
                  безвозвратно.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
