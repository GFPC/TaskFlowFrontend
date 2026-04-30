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
  formatApiError,
  type Task,
  type TaskDetail,
} from "@/lib/api";
import type { ProjectMember } from "@/lib/api";
import {
  canAssignProjectTasks,
  canEditTaskFieldsAdmin,
  canEditTaskDescription,
  canChangeTaskStatus,
  isProjectStatusOnlyRole,
  canDeleteTask,
} from "@/lib/project-permissions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Trash2,
  Save,
  Play,
  CheckCircle2,
  Loader2,
  Lock,
  ArrowRight,
  MessageSquareText,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { NotesPanel } from "@/components/notes/notes-panel";

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

const DEPENDENCY_TYPE_LABELS: Record<string, string> = {
  blocks: "Блокирует",
  simple: "Связь",
  dependency: "Зависимость",
};

interface Props {
  task: any;
  projectSlug: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  /** Карточка связанной задачи (граф / список проекта). */
  onOpenRelatedTask?: (taskId: number) => void;
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
  onOpenRelatedTask,
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
  const statusOnlyRole = isProjectStatusOnlyRole(projectRole);
  const canMutateSomething =
    canAdminFields || canAssign || canDesc || canStatus;

  const creatorUsername =
    (base as Task).creator_username ?? (base as { creator?: string }).creator;

  const deleteAllowed = canDeleteTask(
    projectRole,
    { creator_username: creatorUsername },
    user?.username,
  );

  async function handleSave(statusOverride?: string) {
    if (!canMutateSomething) {
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
      if (canChangeTaskStatus(projectRole) && statusToUse !== orig.status) {
        await tasksApi.changeStatus(projectSlug, task.id, statusToUse);
      }
      toast.success("Задача обновлена");
      onUpdate();
      onClose();
    } catch (err: unknown) {
      toast.error(formatApiError(err));
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

  const taskBase = base as Task;
  const taskDetail = resolved as TaskDetail | null;
  const incomingDeps = taskDetail?.incoming_dependencies ?? [];
  const outgoingDeps = taskDetail?.outgoing_dependencies ?? [];
  const showBlockInfo =
    (taskBase.status === "todo" && !taskBase.is_ready) ||
    Boolean(taskBase.blocked_reason?.trim()) ||
    (taskBase.blocking_task_ids && taskBase.blocking_task_ids.length > 0);
  const hasDependencyLists =
    incomingDeps.length > 0 || outgoingDeps.length > 0;

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
          {statusOnlyRole && !loadingDetail && (
            <DialogDescription>
              Поля задачи редактируют владелец и менеджер. Вы можете менять
              статус (в т. ч. кнопками ниже).
            </DialogDescription>
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
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canAdminFields}
            />
            {!canAdminFields && (
              <p className="text-xs text-muted-foreground mt-1">
                Название меняют владелец и менеджер.
              </p>
            )}
          </div>

          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Описание задачи"
              disabled={!canDesc}
            />
            {!canDesc && (
              <p className="text-xs text-muted-foreground mt-1">
                Редактирование описания недоступно для вашей роли.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Статус</Label>
              <Select
                value={status}
                onValueChange={setStatus}
                disabled={!canStatus}
              >
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
              {!canStatus && (
                <p className="text-xs text-muted-foreground mt-1">
                  Смена статуса недоступна для вашей роли.
                </p>
              )}
            </div>
            <div>
              <Label>Приоритет</Label>
              <Select
                value={priority}
                onValueChange={setPriority}
                disabled={!canAdminFields}
              >
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
              {!canAdminFields && (
                <p className="text-xs text-muted-foreground mt-1">
                  Приоритет задают владелец и менеджер.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label>Дедлайн</Label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={!canAdminFields}
            />
            {!canAdminFields && (
              <p className="text-xs text-muted-foreground mt-1">
                {(base as Task).deadline
                  ? "Менять дедлайн могут владелец и менеджер."
                  : "Дедлайн задают владелец и менеджер."}
              </p>
            )}
          </div>

          <div>
            <Label>Исполнитель</Label>
            <Select
              value={assigneeUsername ? assigneeUsername : ASSIGNEE_NONE}
              onValueChange={(v) =>
                setAssigneeUsername(v === ASSIGNEE_NONE ? "" : v)
              }
              disabled={!canAssign}
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
            {!canAssign && (
              <p className="text-xs text-muted-foreground mt-1">
                Назначает владелец или менеджер.
              </p>
            )}
          </div>

          {(showBlockInfo || hasDependencyLists) && (
            <div className="space-y-3">
              {showBlockInfo && (
                <Alert
                  variant={
                    taskBase.status === "todo" && !taskBase.is_ready
                      ? "destructive"
                      : "default"
                  }
                  className="py-3"
                >
                  <Lock className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    {taskBase.status === "todo" && !taskBase.is_ready
                      ? "Задача ждёт зависимостей"
                      : "Состояние по зависимостям"}
                  </AlertTitle>
                  <AlertDescription className="text-xs space-y-1.5">
                    {taskBase.blocked_reason?.trim() ? (
                      <p className="text-foreground/90">
                        {taskBase.blocked_reason}
                      </p>
                    ) : taskBase.status === "todo" && !taskBase.is_ready ? (
                      <p>
                        Завершите или снимите блокировки с задач-предшественников.
                      </p>
                    ) : null}
                    {taskBase.blocking_task_ids &&
                      taskBase.blocking_task_ids.length > 0 && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          Блокируют: №{taskBase.blocking_task_ids.join(", №")}
                        </p>
                      )}
                  </AlertDescription>
                </Alert>
              )}

              {hasDependencyLists && (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ArrowRight className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
                    Блокируют эту задачу
                  </p>
                  {incomingDeps.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {incomingDeps.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center gap-2 justify-between gap-y-1"
                        >
                          <span className="text-muted-foreground min-w-0">
                            <span className="font-medium text-foreground">
                              {d.source_task_name}
                            </span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {DEPENDENCY_TYPE_LABELS[d.dependency_type] ??
                                d.dependency_type}
                            </Badge>
                            {d.actions?.length ? (
                              <span className="ml-1 text-[10px] text-muted-foreground">
                                · {d.actions.length}{" "}
                                {d.actions.length === 1
                                  ? "действие"
                                  : "действий"}
                              </span>
                            ) : null}
                          </span>
                          {onOpenRelatedTask ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] shrink-0"
                              onClick={() => onOpenRelatedTask(d.source_task_id)}
                            >
                              №{d.source_task_id}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}

                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 pt-1 border-t border-border/60">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    Эта задача блокирует
                  </p>
                  {outgoingDeps.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {outgoingDeps.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center gap-2 justify-between gap-y-1"
                        >
                          <span className="text-muted-foreground min-w-0">
                            <span className="font-medium text-foreground">
                              {d.target_task_name}
                            </span>
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {DEPENDENCY_TYPE_LABELS[d.dependency_type] ??
                                d.dependency_type}
                            </Badge>
                          </span>
                          {onOpenRelatedTask ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[10px] shrink-0"
                              onClick={() => onOpenRelatedTask(d.target_task_id)}
                            >
                              №{d.target_task_id}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  )}
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Заметки
              </p>
              <p className="text-xs text-muted-foreground">
                Комментарии и рабочие пометки по этой задаче.
              </p>
            </div>
            <NotesPanel
              projectSlug={projectSlug}
              taskId={task.id}
              currentUsername={user?.username}
              projectRole={projectRole}
              compact
            />
          </div>

          <Separator />

          {canStatus && (
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
                {base.status === "todo" && !(base as Task).is_ready && (
                  <Button
                    type="button"
                    className="flex-1"
                    variant="secondary"
                    disabled
                  >
                    <Play className="h-4 w-4 mr-2" /> Ожидает зависимостей
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

          {!canMutateSomething ? (
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
