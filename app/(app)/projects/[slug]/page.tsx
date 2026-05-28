"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  projects,
  tasks,
  teams,
  formatApiError,
  type ProjectDetail,
  type Task,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  GitBranch,
  Users,
  CheckCircle2,
  Plus,
  Crown,
  Shield,
  Code2,
  Eye,
  Trash2,
  Archive,
  RotateCcw,
  Loader2,
  ListTodo,
  Clock,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Search,
  PlayCircle,
  ListFilter,
  Pencil,
  MessageSquareText,
  History,
  BarChart3,
  GraduationCap,
  Calculator,
  TrendingUp,
} from "lucide-react";
import {
  canAssignProjectTasks,
  canChangeTaskStatus,
  canCreateTasksInProject,
  canDeleteTask,
  canEditTaskFieldsAdmin,
  canEditTaskDescription,
  normalizeProjectUserRole,
  resolveCanChangeTaskStatus,
} from "@/lib/project-permissions";
import { TaskDetailDialog } from "@/components/graph/task-detail-dialog";
import { NotesPanel } from "@/components/notes/notes-panel";
import { ProjectHistoryPanel } from "@/components/tasks/task-history-panel";
import { ProjectRoleSelectItems } from "@/components/projects/project-role-select-items";
import { useUserPermissions } from "@/lib/user-permissions";
import { projectRoleLabel } from "@/lib/roles";

function isTaskOverdue(t: Task): boolean {
  if (!t.deadline || t.status === "completed") return false;
  return new Date(t.deadline).getTime() < Date.now();
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { user } = useAuth();
  const { canViewReports } = useUserPermissions(user);
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedFromTaskQuery = useRef<string | null>(null);

  const swrIdentity = user?.username ?? "__";

  const {
    data: project,
    isLoading,
    mutate: mutateProject,
  } = useSWR<ProjectDetail>(
    slug ? (["project", slug, swrIdentity] as const) : null,
    () => projects.get(slug),
    {
      dedupingInterval: 60000,
    },
  );

  const {
    data: tasksList,
    isLoading: tasksLoading,
    mutate: mutateTasks,
  } = useSWR(
    project ? (["tasks", slug, swrIdentity] as const) : null,
    () => tasks.list(slug),
    {
      dedupingInterval: 30000,
    },
  );

  const { data: taskStats } = useSWR(
    project ? (["task-stats", slug, swrIdentity] as const) : null,
    () => tasks.stats(slug),
    { dedupingInterval: 300000 },
  );

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("0");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [createTaskLoading, setCreateTaskLoading] = useState(false);

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [taskSearch, setTaskSearch] = useState("");

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberRole, setMemberRole] = useState("developer");
  const [addMemberPage, setAddMemberPage] = useState(1);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addingMemberUsername, setAddingMemberUsername] = useState<
    string | null
  >(null);

  const ADD_MEMBER_PAGE_SIZE = 8;

  const {
    data: teamMembersForProject,
    isLoading: teamMembersForProjectLoading,
    mutate: mutateTeamMembersForProject,
  } = useSWR(
    addMemberOpen && project?.team_slug
      ? [`team-members-project`, project.team_slug]
      : null,
    () => teams.members(project!.team_slug, false),
  );

  const teamMembersEligible = useMemo(() => {
    if (!teamMembersForProject || !project) return [];
    const inProject = new Set(project.members.map((m) => m.username));
    return teamMembersForProject.filter(
      (m) => m.is_active && !inProject.has(m.username),
    );
  }, [teamMembersForProject, project]);

  const teamMembersFiltered = useMemo(() => {
    const q = addMemberSearch.trim().toLowerCase();
    if (!q) return teamMembersEligible;
    return teamMembersEligible.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.first_name.toLowerCase().includes(q) ||
        m.last_name.toLowerCase().includes(q),
    );
  }, [teamMembersEligible, addMemberSearch]);

  const addMemberTotalPages = Math.max(
    1,
    Math.ceil(teamMembersFiltered.length / ADD_MEMBER_PAGE_SIZE),
  );

  const teamMembersPageSlice = useMemo(() => {
    const start = (addMemberPage - 1) * ADD_MEMBER_PAGE_SIZE;
    return teamMembersFiltered.slice(start, start + ADD_MEMBER_PAGE_SIZE);
  }, [teamMembersFiltered, addMemberPage]);

  useEffect(() => {
    if (!addMemberOpen) {
      setAddMemberPage(1);
      setAddMemberSearch("");
      setAddingMemberUsername(null);
    }
  }, [addMemberOpen]);

  useEffect(() => {
    setAddMemberPage(1);
  }, [addMemberSearch, teamMembersFiltered.length]);

  useEffect(() => {
    setAddMemberPage((p) => Math.min(p, addMemberTotalPages));
  }, [addMemberTotalPages]);

  useEffect(() => {
    openedFromTaskQuery.current = null;
    setTaskSearch("");
  }, [slug]);

  useEffect(() => {
    if (!taskDetailOpen) {
      openedFromTaskQuery.current = null;
    }
  }, [taskDetailOpen]);

  useEffect(() => {
    const tid = searchParams.get("task");
    if (!tid || !tasksList?.length) return;
    const id = Number(tid);
    if (!Number.isFinite(id)) return;
    const key = `${slug}:${id}`;
    if (openedFromTaskQuery.current === key) return;
    const t = tasksList.find((x) => x.id === id);
    if (t) {
      openedFromTaskQuery.current = key;
      setSelectedTask(t);
      setTaskDetailOpen(true);
      router.replace(`/projects/${slug}`, { scroll: false });
    }
  }, [searchParams, tasksList, slug, router]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const openEditProject = () => {
    if (!project?.can_edit_project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditOpen(true);
  };

  const handleUpdateProject = async () => {
    if (!project?.can_edit_project) return;
    const nextName = editName.trim();
    if (nextName.length < 2) {
      toast.error("Название проекта должно быть не короче 2 символов");
      return;
    }
    setEditLoading(true);
    try {
      await projects.update(slug, {
        name: nextName,
        description: editDescription.trim() || undefined,
      });
      await mutateProject();
      mutate("projects");
      mutate(`team-projects-${project.team_slug}`);
      toast.success("Проект обновлен");
      setEditOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskName.trim() || !project) return;
    if (!userCanCreateTasks) return;
    setCreateTaskLoading(true);
    try {
      const canEditTasks =
        project.can_edit_tasks ?? canEditTaskFieldsAdmin(project.user_role);
      const assigneeOk =
        canEditTasks && taskAssignee && taskAssignee !== "none";
      await tasks.create(slug, {
        name: taskName.trim(),
        ...(canEditTasks && taskDescription.trim()
          ? { description: taskDescription.trim() }
          : {}),
        assignee_username: assigneeOk ? taskAssignee : undefined,
        ...(canEditTasks
          ? {
              priority: parseInt(taskPriority, 10),
              ...(taskDeadline
                ? { deadline: new Date(taskDeadline).toISOString() }
                : {}),
            }
          : {}),
        project_slug: slug,
      });
      toast.success("Задача создана");
      mutateTasks();
      mutate(["task-stats", slug, swrIdentity] as const);
      setCreateTaskOpen(false);
      setTaskName("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskPriority("0");
      setTaskDeadline("");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    const t = tasksList?.find((x) => x.id === taskId);
    if (!project || !t) return;
    const canChange = resolveCanChangeTaskStatus(
      project.can_change_task_status,
      project.user_role,
      t,
      user?.username,
    );
    if (!canChange) return;
    try {
      await tasks.changeStatus(slug, taskId, status);
      toast.success("Статус обновлен");
      mutateTasks();
      mutate(["task-stats", slug, swrIdentity] as const);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const confirmDeleteTask = async () => {
    if (
      !taskPendingDelete ||
      !project ||
      !userCanDeleteTasks
    )
      return;
    const deletedId = taskPendingDelete.id;
    try {
      await tasks.delete(slug, deletedId);
      toast.success("Задача удалена");
      mutateTasks();
      mutate(["task-stats", slug, swrIdentity] as const);
      setTaskPendingDelete(null);
      if (selectedTask?.id === deletedId) {
        setSelectedTask(null);
        setTaskDetailOpen(false);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleAddMemberFromTeam = async (username: string) => {
    setAddingMemberUsername(username);
    try {
      await projects.addMember(slug, {
        username,
        role: memberRole,
      });
      toast.success("Участник добавлен в проект");
      await mutateProject();
      await mutateTeamMembersForProject();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setAddingMemberUsername(null);
    }
  };

  const handleRemoveMember = async (username: string) => {
    try {
      await projects.removeMember(slug, username);
      toast.success("Участник удален");
      mutateProject();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleArchive = async () => {
    try {
      if (project?.status === "archived") {
        await projects.restore(slug);
        toast.success("Проект восстановлен");
      } else {
        await projects.archive(slug);
        toast.success("Проект в архиве");
      }
      mutateProject();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== project?.name) return;
    try {
      await projects.delete(slug);
      mutate("projects");
      toast.success("Проект удален");
      router.push("/projects");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const filteredTasks = useMemo(() => {
    if (!tasksList) return [];
    const s = taskSearch.trim().toLowerCase();
    if (!s) return tasksList;
    return tasksList.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        (t.assignee_username?.toLowerCase().includes(s) ?? false) ||
        String(t.id).includes(s),
    );
  }, [tasksList, taskSearch]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Проект не найден</p>
          <Button className="mt-4" asChild>
            <Link href="/projects">К проектам</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const userCanCreateTasks =
    project.can_create_tasks ?? canCreateTasksInProject(project.user_role);
  const userCanEditTasks =
    project.can_edit_tasks ?? canEditTaskFieldsAdmin(project.user_role);
  const userCanAssignTasks = userCanEditTasks;
  const userCanEditTaskMeta = userCanEditTasks;
  const userCanEditTaskDescription = userCanEditTasks;
  const userCanDeleteTasks =
    project.can_delete_tasks ??
    canDeleteTask(project.user_role, { creator_username: "" }, user?.username);
  const userCanChangeTaskStatus =
    project.can_change_task_status ??
    canChangeTaskStatus(project.user_role, undefined, user?.username);

  const canChangeStatusForTask = (task: Task) =>
    resolveCanChangeTaskStatus(
      project.can_change_task_status,
      project.user_role,
      task,
      user?.username,
    );

  const roleIcon = (role: string) => {
    const r = normalizeProjectUserRole(role) ?? role;
    switch (r) {
      case "owner":
        return <Crown className="h-3.5 w-3.5 text-warning" />;
      case "manager":
      case "senior_manager":
        return <Shield className="h-3.5 w-3.5 text-primary" />;
      case "developer":
        return <Code2 className="h-3.5 w-3.5 text-chart-2" />;
      case "intern":
        return <GraduationCap className="h-3.5 w-3.5 text-chart-3" />;
      case "analyst":
        return <TrendingUp className="h-3.5 w-3.5 text-chart-4" />;
      case "accountant":
        return <Calculator className="h-3.5 w-3.5 text-chart-5" />;
      case "observer":
        return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const roleLabel = (role: string) => projectRoleLabel(normalizeProjectUserRole(role) ?? role);

  const statusLabel = (s: string) => {
    switch (s) {
      case "todo":
        return "К выполнению";
      case "in_progress":
        return "В работе";
      case "review":
        return "На проверке";
      case "completed":
        return "Выполнена";
      case "blocked":
        return "Заблокирована";
      default:
        return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "todo":
        return "bg-muted text-muted-foreground";
      case "in_progress":
        return "bg-primary/15 text-primary";
      case "review":
        return "bg-warning/15 text-warning-foreground";
      case "completed":
        return "bg-success/15 text-success";
      case "blocked":
        return "bg-destructive/15 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: number) => {
    switch (p) {
      case 0:
        return "Низкий";
      case 1:
        return "Средний";
      case 2:
        return "Высокий";
      default:
        return String(p);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <Badge
              variant={project.status === "active" ? "default" : "secondary"}
            >
              {project.status === "active" ? "Активный" : "В архиве"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {project.description || "Нет описания"}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              {roleIcon(project.user_role)}
              {roleLabel(project.user_role)}
            </Badge>
            <Link
              href={`/teams/${project.team_slug}`}
              className="hover:text-primary transition-colors"
            >
              {project.team_name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.can_edit_project && (
            <Button
              variant="outline"
              size="sm"
              onClick={openEditProject}
              className="gap-1"
            >
              <Pencil className="h-4 w-4" />
              Изменить
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${slug}/graph`} className="gap-1">
              <GitBranch className="h-4 w-4" />
              Граф
            </Link>
          </Button>
          {canViewReports && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${slug}/reports`} className="gap-1">
                <BarChart3 className="h-4 w-4" />
                Отчёты
              </Link>
            </Button>
          )}
          {project.can_delete_project && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                className="gap-1"
              >
                {project.status === "archived" ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Восстановить
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Архив
                  </>
                )}
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Удалить проект?</DialogTitle>
                    <DialogDescription>
                      {"Введите «"}
                      {project.name}
                      {"» для подтверждения."}
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={project.name}
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteOpen(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={deleteConfirm !== project.name}
                      onClick={handleDeleteProject}
                    >
                      Удалить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать проект</DialogTitle>
            <DialogDescription>
              Измените название и описание проекта. Это увидят все участники.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Название</Label>
              <Input
                id="project-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Название проекта"
                minLength={2}
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-description">
                Описание (необязательно)
              </Label>
              <Textarea
                id="project-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="О чем проект?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editLoading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleUpdateProject}
              disabled={editLoading || editName.trim().length < 2}
            >
              {editLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {taskStats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <ListTodo className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {taskStats.total}
                </p>
                <p className="text-xs text-muted-foreground">Всего задач</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {taskStats.by_status?.completed?.count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Выполнено</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <Clock className="h-5 w-5 text-chart-1" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {taskStats.by_status?.in_progress?.count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">В работе</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {taskStats.overdue}
                </p>
                <p className="text-xs text-muted-foreground">Просрочено</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="notes">Заметки</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-foreground shrink-0">
                Задачи{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  {tasksList?.length ?? 0}
                  {taskSearch.trim() &&
                    filteredTasks.length !== (tasksList?.length ?? 0) &&
                    ` · найдено ${filteredTasks.length}`}
                </span>
              </h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full sm:w-auto sm:max-w-xl sm:justify-end">
                <div className="relative w-full sm:w-64">
                  <ListFilter className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9"
                    placeholder="Поиск: название, @исполнитель, №…"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    aria-label="Поиск задач"
                  />
                </div>
                {userCanCreateTasks && (
                    <Dialog
                      open={createTaskOpen}
                      onOpenChange={setCreateTaskOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="gap-1 shrink-0 w-full sm:w-auto"
                        >
                          <Plus className="h-4 w-4" />
                          Новая задача
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Создать задачу</DialogTitle>
                          <DialogDescription className="text-left">
                            {(() => {
                              const hints = [
                                !userCanEditTaskMeta &&
                                  "Приоритет и дедлайн настраивают владелец и менеджер.",
                                !userCanAssignTasks &&
                                  "Исполнителя назначают владелец и менеджер.",
                                !userCanEditTaskDescription &&
                                  "Описание при создании недоступно для вашей роли.",
                              ].filter(Boolean) as string[];
                              return hints.length > 0
                                ? hints.join(" ")
                                : "Исполнитель выбирается из участников проекта.";
                            })()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <Label>Название</Label>
                            <Input
                              value={taskName}
                              onChange={(e) => setTaskName(e.target.value)}
                              placeholder="Название задачи"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Описание</Label>
                            <Textarea
                              value={taskDescription}
                              onChange={(e) =>
                                setTaskDescription(e.target.value)
                              }
                              placeholder="Описание задачи"
                              rows={3}
                              disabled={!userCanEditTaskDescription}
                            />
                          </div>
                          <div
                            className={
                              userCanAssignTasks || userCanEditTaskMeta
                                ? "grid grid-cols-2 gap-3"
                                : "grid grid-cols-1 gap-3"
                            }
                          >
                            <div className="flex flex-col gap-2">
                              <Label>Исполнитель</Label>
                              <Select
                                value={taskAssignee || "none"}
                                onValueChange={(v) =>
                                  setTaskAssignee(v === "none" ? "" : v)
                                }
                                disabled={!userCanAssignTasks}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={
                                      userCanAssignTasks
                                        ? "Не назначен"
                                        : "Недоступно для вашей роли"
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    Не назначен
                                  </SelectItem>
                                  {project.members
                                    .filter((m) => m.is_active)
                                    .map((m) => (
                                      <SelectItem
                                        key={m.username}
                                        value={m.username}
                                      >
                                        {m.first_name} {m.last_name} (@
                                        {m.username})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Label>Приоритет</Label>
                              <Select
                                value={userCanEditTaskMeta ? taskPriority : "1"}
                                onValueChange={setTaskPriority}
                                disabled={!userCanEditTaskMeta}
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
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label>Дедлайн</Label>
                            <Input
                              type="datetime-local"
                              value={taskDeadline}
                              onChange={(e) => setTaskDeadline(e.target.value)}
                              disabled={!userCanEditTaskMeta}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setCreateTaskOpen(false)}
                          >
                            Отмена
                          </Button>
                          <Button
                            onClick={handleCreateTask}
                            disabled={createTaskLoading || !taskName.trim()}
                          >
                            {createTaskLoading && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Создать
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
              </div>
            </div>
          </div>

          {tasksLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="py-3">
                    <Skeleton className="h-5 w-48" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasksList?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground pb-4">Нет задач</p>
                {userCanCreateTasks && (
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => setCreateTaskOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Создать первую задачу
                    </Button>
                  )}
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <ListFilter className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Нет задач по запросу
                </p>
                <Button
                  variant="link"
                  className="mt-1"
                  onClick={() => setTaskSearch("")}
                >
                  Сбросить поиск
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredTasks.map((task: Task) => (
                <Card
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "hover:border-primary/40 transition-colors cursor-pointer",
                    isTaskOverdue(task) &&
                      "border-destructive/35 bg-destructive/[0.04]",
                    task.status === "todo" &&
                      task.is_ready &&
                      "border-success/25 bg-success/[0.03]",
                  )}
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDetailOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedTask(task);
                      setTaskDetailOpen(true);
                    }
                  }}
                >
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge
                        className={`${statusColor(task.status)} text-xs shrink-0`}
                      >
                        {statusLabel(task.status)}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {task.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.assignee_username && (
                            <span>@{task.assignee_username}</span>
                          )}
                          {task.deadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(task.deadline).toLocaleDateString("ru")}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0"
                          >
                            {priorityLabel(task.priority)}
                          </Badge>
                          {isTaskOverdue(task) && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              Просрочено
                            </span>
                          )}
                          {task.status === "todo" && task.is_ready && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-success">
                              <PlayCircle className="h-3 w-3" />
                              Можно начать
                            </span>
                          )}
                          {task.status === "todo" && !task.is_ready && (
                            <span className="text-[10px] text-muted-foreground">
                              Ждёт зависимостей
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {canChangeStatusForTask(task) ? (
                        <Select
                          value={task.status}
                          onValueChange={(s) => handleStatusChange(task.id, s)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">К выполнению</SelectItem>
                            <SelectItem value="in_progress">
                              В работе
                            </SelectItem>
                            <SelectItem value="review">На проверке</SelectItem>
                            <SelectItem value="completed">Выполнена</SelectItem>
                            <SelectItem value="blocked">
                              Заблокирована
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value={task.status} disabled>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">К выполнению</SelectItem>
                            <SelectItem value="in_progress">
                              В работе
                            </SelectItem>
                            <SelectItem value="review">На проверке</SelectItem>
                            <SelectItem value="completed">Выполнена</SelectItem>
                            <SelectItem value="blocked">
                              Заблокирована
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {userCanDeleteTasks && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setTaskPendingDelete(task)}
                          aria-label="Удалить задачу"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Заметки проекта
              </CardTitle>
              <CardDescription>
                Общие заметки видны всем участникам проекта.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotesPanel
                projectSlug={slug}
                currentUsername={user?.username}
                projectRole={project.user_role}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                История проекта
              </CardTitle>
              <CardDescription>
                События по задачам проекта, включая удалённые задачи
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectHistoryPanel
                projectSlug={slug}
                onOpenTask={(taskId) => {
                  const fromList = tasksList?.find((t) => t.id === taskId);
                  if (fromList) {
                    setSelectedTask(fromList);
                    setTaskDetailOpen(true);
                    return;
                  }
                  void tasks
                    .get(slug, taskId)
                    .then((d) => {
                      setSelectedTask(d);
                      setTaskDetailOpen(true);
                    })
                    .catch(() => toast.error("Не удалось загрузить задачу"));
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">
              Участники ({project.members.length})
            </h3>
            {project.can_manage_members && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Добавить из команды</DialogTitle>
                    <DialogDescription>
                      Только участники команды «{project.team_name}», ещё не
                      входящие в этот проект. Нажмите на строку, чтобы добавить
                      с выбранной ролью.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Роль в проекте</Label>
                      <Select value={memberRole} onValueChange={setMemberRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <ProjectRoleSelectItems />
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={addMemberSearch}
                        onChange={(e) => setAddMemberSearch(e.target.value)}
                        placeholder="Поиск по имени или логину…"
                      />
                    </div>
                    <div className="rounded-lg border min-h-[220px] max-h-[min(320px,50vh)] overflow-y-auto">
                      {teamMembersForProjectLoading ? (
                        <div className="p-4 space-y-3">
                          {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : teamMembersFiltered.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-6 text-center">
                          {teamMembersEligible.length === 0
                            ? "Все участники команды уже в проекте."
                            : "Никого не найдено. Измените поиск."}
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {teamMembersPageSlice.map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                disabled={addingMemberUsername !== null}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/80 transition-colors disabled:opacity-60"
                                onClick={() =>
                                  void handleAddMemberFromTeam(m.username)
                                }
                              >
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarFallback className="text-xs">
                                    {m.first_name[0]}
                                    {m.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                    {m.first_name} {m.last_name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    @{m.username}
                                  </p>
                                </div>
                                {addingMemberUsername === m.username ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                                ) : (
                                  <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {teamMembersFiltered.length > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={addMemberPage <= 1}
                          onClick={() =>
                            setAddMemberPage((p) => Math.max(1, p - 1))
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Назад
                        </Button>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {addMemberPage} / {addMemberTotalPages}
                          <span className="text-muted-foreground/70">
                            {" "}
                            ({teamMembersFiltered.length})
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={addMemberPage >= addMemberTotalPages}
                          onClick={() =>
                            setAddMemberPage((p) =>
                              Math.min(addMemberTotalPages, p + 1),
                            )
                          }
                        >
                          Вперёд
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAddMemberOpen(false)}
                    >
                      Закрыть
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {project.members
              .sort((a, b) => b.role_priority - a.role_priority)
              .map((member) => (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.first_name[0]}
                          {member.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const roleSelectLocked =
                          !project.can_manage_members ||
                          member.role === "owner" ||
                          member.username === user?.username;
                        return (
                          <Select
                            value={member.role}
                            disabled={roleSelectLocked}
                            onValueChange={(role) => {
                              if (roleSelectLocked) return;
                              projects
                                .updateMember(slug, member.username, role)
                                .then(() => {
                                  toast.success("Роль изменена");
                                  mutateProject();
                                })
                                .catch((err: unknown) => {
                                  toast.error(formatApiError(err));
                                });
                            }}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <ProjectRoleSelectItems />
                            </SelectContent>
                          </Select>
                        );
                      })()}
                      {project.can_manage_members &&
                      member.role !== "owner" &&
                      member.username !== user?.username ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.username)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectSlug={slug}
          open={taskDetailOpen}
          onClose={() => {
            setTaskDetailOpen(false);
            setSelectedTask(null);
          }}
          onUpdate={() => {
            mutateTasks();
            mutate(["task-stats", slug, swrIdentity] as const);
          }}
          onOpenRelatedTask={(taskId) => {
            const fromList = tasksList?.find((t) => t.id === taskId);
            if (fromList) {
              setSelectedTask(fromList);
              return;
            }
            void tasks
              .get(slug, taskId)
              .then((d) => setSelectedTask(d))
              .catch(() => toast.error("Не удалось загрузить задачу"));
          }}
        />
      )}

      <AlertDialog
        open={taskPendingDelete != null}
        onOpenChange={(open) => !open && setTaskPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Задача «{taskPendingDelete?.name}» будет удалена безвозвратно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteTask()}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
