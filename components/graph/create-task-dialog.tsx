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
import { tasks as tasksApi, projects as projectsApi, formatApiError } from "@/lib/api";
import type { ProjectMember } from "@/lib/api";
import {
  canAssignProjectTasks,
  canCreateTasksInProject,
  canEditTaskFieldsAdmin,
  canEditTaskDescription,
  isProjectReadOnlyRole,
} from "@/lib/project-permissions";
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
  const [canCreateTask, setCanCreateTask] = useState(false);
  const [canAssign, setCanAssign] = useState(false);
  const [canEditMeta, setCanEditMeta] = useState(false);
  const [canEditDesc, setCanEditDesc] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectSlug) return;
    setMembersLoading(true);
    projectsApi
      .get(projectSlug)
      .then((p) => {
        const readOnly = isProjectReadOnlyRole(p.user_role);
        setCanCreateTask(
          !readOnly &&
            (p.can_create_tasks ?? canCreateTasksInProject(p.user_role)),
        );
        setMembers(p.members.filter((m) => m.is_active));
        setCanAssign(
          !readOnly &&
            (p.can_edit_tasks ?? canAssignProjectTasks(p.user_role)),
        );
        setCanEditMeta(
          !readOnly &&
            (p.can_edit_tasks ?? canEditTaskFieldsAdmin(p.user_role)),
        );
        setCanEditDesc(
          !readOnly &&
            (p.can_edit_tasks ?? canEditTaskDescription(p.user_role)),
        );
      })
      .catch(() => {
        toast.error("Не удалось загрузить проект");
        setCanCreateTask(false);
        setMembers([]);
        setCanAssign(false);
        setCanEditMeta(false);
        setCanEditDesc(false);
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
    if (!canCreateTask) {
      toast.error("Создавать задачи могут только владелец и менеджер проекта.");
      return;
    }
    setLoading(true);
    try {
      await tasksApi.create(projectSlug, {
        name: name.trim(),
        ...(canEditDesc && description.trim()
          ? { description: description.trim() }
          : {}),
        ...(canEditMeta ? { priority: Number(priority) } : {}),
        project_slug: projectSlug,
        ...(canAssign && assigneeUsername
          ? { assignee_username: assigneeUsername }
          : {}),
      });
      toast.success("Задача создана");
      resetForm();
      onCreate();
    } catch (err) {
      toast.error(formatApiError(err));
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
            {(() => {
              const hints = [
                !canEditMeta &&
                  "Приоритет по умолчанию средний; менять могут владелец и менеджер.",
                !canAssign && "Исполнителя назначают владелец и менеджер.",
                !canEditDesc &&
                  "Описание при создании для вашей роли недоступно.",
              ].filter(Boolean) as string[];
              return hints.length > 0
                ? hints.join(" ")
                : "Исполнитель выбирается из участников проекта.";
            })()}
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
              disabled={!canEditDesc}
            />
          </div>
          <div>
            <Label>Исполнитель</Label>
            <Select
              value={assigneeUsername || NONE}
              onValueChange={(v) =>
                setAssigneeUsername(v === NONE ? "" : v)
              }
              disabled={membersLoading || !canAssign}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    membersLoading
                      ? "Загрузка участников…"
                      : !canAssign
                        ? "Недоступно для вашей роли"
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
          <div>
            <Label>Приоритет</Label>
            <Select
              value={canEditMeta ? priority : "1"}
              onValueChange={setPriority}
              disabled={!canEditMeta}
            >
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
          <Button
            onClick={handleCreate}
            disabled={loading || !canCreateTask}
            className="w-full"
          >
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
