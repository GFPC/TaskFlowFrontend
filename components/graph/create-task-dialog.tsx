"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { tasks as tasksApi, projects as projectsApi, ApiError } from "@/lib/api";
import type { ProjectMember } from "@/lib/api";
import { canAssignProjectTasks } from "@/lib/project-permissions";
import { toast } from "sonner";

interface Props {
  projectSlug: string;
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

const NONE = "__none__";

export function CreateTaskDialog({
  projectSlug,
  open,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [assigneeUsername, setAssigneeUsername] = useState("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [canAssign, setCanAssign] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectSlug) return;
    setMembersLoading(true);
    projectsApi
      .get(projectSlug)
      .then((p) => {
        setMembers(p.members.filter((m) => m.is_active));
        setCanAssign(canAssignProjectTasks(p.user_role));
      })
      .catch(() => {
        toast.error("Не удалось загрузить проект");
        setMembers([]);
        setCanAssign(false);
      })
      .finally(() => setMembersLoading(false));
  }, [open, projectSlug]);

  function resetForm() {
    setName("");
    setDescription("");
    setPriority("1");
    setAssigneeUsername("");
  }

  async function handleCreate() {
    if (!name.trim()) return toast.error("Введите название");
    setLoading(true);
    try {
      await tasksApi.create(projectSlug, {
        name: name.trim(),
        description: description.trim() || undefined,
        priority: Number(priority),
        project_slug: projectSlug,
        ...(canAssign && assigneeUsername
          ? { assignee_username: assigneeUsername }
          : {}),
      });
      toast.success("Задача создана");
      resetForm();
      onCreate();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : "Ошибка создания задачи";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
          <DialogDescription>
            {canAssign
              ? "Исполнитель — из числа участников проекта."
              : "Назначение исполнителя доступно владельцу и менеджеру проекта."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-name">Название</Label>
            <Input
              id="task-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название задачи"
            />
          </div>
          <div>
            <Label htmlFor="task-desc">Описание</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание..."
              rows={3}
            />
          </div>
          {canAssign && (
            <div>
              <Label>Исполнитель</Label>
              <Select
                value={assigneeUsername || NONE}
                onValueChange={(v) =>
                  setAssigneeUsername(v === NONE ? "" : v)
                }
                disabled={membersLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      membersLoading
                        ? "Загрузка участников…"
                        : "Не назначен"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Не назначен</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.username}>
                      {m.first_name} {m.last_name} (@{m.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Низкий</SelectItem>
                <SelectItem value="1">Средний</SelectItem>
                <SelectItem value="2">Высокий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
