"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { tasks as tasksApi, projects as projectsApi, type ProjectMember } from "@/lib/api";
import { toast } from "sonner";
import { Trash2, Save, Play, CheckCircle2, Calendar, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import useSWR from "swr";

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

interface Props {
  task: any;
  projectSlug: string;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetailDialog({
  task,

  projectSlug,

  open,

  onClose,

  onUpdate,
}: Props) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(String(task.priority ?? 0));
  const [deadline, setDeadline] = useState<Date | undefined>(
    task.deadline ? new Date(task.deadline) : undefined
  );
  const [assigneeUsername, setAssigneeUsername] = useState(task.assignee_username || "");
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: members } = useSWR<ProjectMember[]>(
    `project-members-${projectSlug}`,
    () => projectsApi.members(projectSlug)
  );

  async function handleSave() {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        description,
        priority: Number(priority),
        ...(deadline && { deadline: deadline.toISOString() }),
        ...(assigneeUsername && { assignee_username: assigneeUsername }),
      };
      await tasksApi.update(projectSlug, task.id, payload);
      if (status !== task.status) {
        await tasksApi.changeStatus(projectSlug, task.id, status);
      }
      toast.success("Задача обновлена");
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.detail || "Ошибка обновления");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setShowDeleteDialog(true);
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Задача #{task.id}
            <Badge variant="outline">
              {priorityLabels[task.priority] ?? "Средний"}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание задачи..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Статус</Label>
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
            </div>
            <div>
              <Label>Приоритет</Label>
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
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Исполнитель</Label>
              <Select value={assigneeUsername} onValueChange={setAssigneeUsername}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не назначен</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.user_id} value={member.username}>
                      {member.first_name} {member.last_name} (@{member.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Дедлайн</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "d MMM yyyy", { locale: ru }) : "Не указан"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {task.status === "todo" && task.is_ready && (
                <Button
                  className="flex-1 bg-success hover:bg-success/90"
                  onClick={() => {
                    setStatus("in_progress");
                    handleSave();
                  }}
                >
                  <Play className="h-4 w-4 mr-2" /> Начать работу
                </Button>
              )}
              {task.status !== "completed" && (
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setStatus("completed");
                    handleSave();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Завершить
                </Button>
              )}
            </div>
          </div>
          <Separator />

          <div className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> Удалить
            </Button>

            <Button size="sm" onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 mr-1" /> Сохранить
            </Button>
          </div>

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
