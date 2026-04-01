"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { tasks as tasksApi, projects as projectsApi, type ProjectMember } from "@/lib/api";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar } from "lucide-react";
import useSWR from "swr";

interface Props {
  projectSlug: string;
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

export function CreateTaskDialog({
  projectSlug,
  open,
  onClose,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("1");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [assigneeUsername, setAssigneeUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: members } = useSWR<ProjectMember[]>(
    `project-members-${projectSlug}`,
    () => projectsApi.members(projectSlug)
  );

  async function handleCreate() {
    if (!name.trim()) return toast.error("Введите название");
    setLoading(true);
    try {
      await tasksApi.create(projectSlug, {
        name,
        description,
        priority: Number(priority),
        project_slug: projectSlug,
        ...(deadline && { deadline: deadline.toISOString() }),
        ...(assigneeUsername && { assignee_username: assigneeUsername }),
      });
      toast.success("Задача создана");
      setName("");
      setDescription("");
      setPriority("1");
      setDeadline(undefined);
      setAssigneeUsername("");
      onCreate();
    } catch {
      toast.error("Ошибка создания задачи");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название задачи"
            />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
