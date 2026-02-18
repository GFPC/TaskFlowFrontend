"use client";

import { use, useState } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { projects, tasks, ApiError, type ProjectDetail, type Task } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

export default function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const { data: project, isLoading, mutate: mutateProject } = useSWR<ProjectDetail>(
    `project-${slug}`,
    () => projects.get(slug),
    { dedupingInterval: 60000 }
  );

  const { data: tasksList, isLoading: tasksLoading, mutate: mutateTasks } = useSWR(
    project ? `tasks-${slug}` : null,
    () => tasks.list(slug),
    { dedupingInterval: 30000 }
  );

  const { data: taskStats } = useSWR(
    project ? `task-stats-${slug}` : null,
    () => tasks.stats(slug),
    { dedupingInterval: 300000 }
  );

  // Create Task dialog
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("0");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [createTaskLoading, setCreateTaskLoading] = useState(false);

  // Add Member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberUsername, setMemberUsername] = useState("");
  const [memberRole, setMemberRole] = useState("developer");
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const handleCreateTask = async () => {
    if (!taskName.trim()) return;
    setCreateTaskLoading(true);
    try {
      await tasks.create(slug, {
        name: taskName.trim(),
        description: taskDescription.trim() || undefined,
        assignee_username: taskAssignee || undefined,
        priority: parseInt(taskPriority),
        deadline: taskDeadline || undefined,
        project_slug: slug,
      });
      toast.success("Задача создана");
      mutateTasks();
      mutate(`task-stats-${slug}`);
      setCreateTaskOpen(false);
      setTaskName("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskPriority("0");
      setTaskDeadline("");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    } finally {
      setCreateTaskLoading(false);
    }
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    try {
      await tasks.changeStatus(slug, taskId, status);
      toast.success("Статус обновлен");
      mutateTasks();
      mutate(`task-stats-${slug}`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await tasks.delete(slug, taskId);
      toast.success("Задача удалена");
      mutateTasks();
      mutate(`task-stats-${slug}`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleAddMember = async () => {
    if (!memberUsername.trim()) return;
    setAddMemberLoading(true);
    try {
      await projects.addMember(slug, { username: memberUsername.trim(), role: memberRole });
      toast.success("Участник добавлен");
      mutateProject();
      setAddMemberOpen(false);
      setMemberUsername("");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (username: string) => {
    try {
      await projects.removeMember(slug, username);
      toast.success("Участник удален");
      mutateProject();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
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
      if (err instanceof ApiError) toast.error(err.detail);
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
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Проект не найден</p>
          <Button className="mt-4" asChild><Link href="/projects">К проектам</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3.5 w-3.5 text-warning" />;
      case "manager": return <Shield className="h-3.5 w-3.5 text-primary" />;
      case "developer": return <Code2 className="h-3.5 w-3.5 text-chart-2" />;
      case "observer": return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
      default: return null;
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Владелец";
      case "manager": return "Менеджер";
      case "developer": return "Разработчик";
      case "observer": return "Наблюдатель";
      default: return role;
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "todo": return "К выполнению";
      case "in_progress": return "В работе";
      case "review": return "На проверке";
      case "completed": return "Выполнена";
      case "blocked": return "Заблокирована";
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "todo": return "bg-muted text-muted-foreground";
      case "in_progress": return "bg-primary/15 text-primary";
      case "review": return "bg-warning/15 text-warning-foreground";
      case "completed": return "bg-success/15 text-success";
      case "blocked": return "bg-destructive/15 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const priorityLabel = (p: number) => {
    switch (p) {
      case 0: return "Низкий";
      case 1: return "Средний";
      case 2: return "Высокий";
      default: return String(p);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
            <Badge variant={project.status === "active" ? "default" : "secondary"}>
              {project.status === "active" ? "Активный" : "В архиве"}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{project.description || "Нет описания"}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              {roleIcon(project.user_role)}
              {roleLabel(project.user_role)}
            </Badge>
            <Link href={`/teams/${project.team_slug}`} className="hover:text-primary transition-colors">
              {project.team_name}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${slug}/graph`} className="gap-1">
              <GitBranch className="h-4 w-4" />
              Граф
            </Link>
          </Button>
          {project.can_delete_project && (
            <>
              <Button variant="outline" size="sm" onClick={handleArchive} className="gap-1">
                {project.status === "archived" ? (
                  <><RotateCcw className="h-4 w-4" />Восстановить</>
                ) : (
                  <><Archive className="h-4 w-4" />Архив</>
                )}
              </Button>
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Удалить проект?</DialogTitle>
                    <DialogDescription>
                      {"Введите «"}{project.name}{"» для подтверждения."}
                    </DialogDescription>
                  </DialogHeader>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={project.name}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteOpen(false)}>Отмена</Button>
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

      {/* Stats */}
      {taskStats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <ListTodo className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">{taskStats.total}</p>
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
                <p className="text-xl font-bold text-foreground">{taskStats.overdue}</p>
                <p className="text-xs text-muted-foreground">Просрочено</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Задачи ({tasksList?.length ?? 0})</h3>
            {project.can_create_tasks && (
              <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Новая задача
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Создать задачу</DialogTitle>
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
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Описание задачи"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-2">
                        <Label>Исполнитель</Label>
                        <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                          <SelectTrigger>
                            <SelectValue placeholder="Не выбран" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {project.members.map((m) => (
                              <SelectItem key={m.username} value={m.username}>
                                {m.first_name} {m.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>Приоритет</Label>
                        <Select value={taskPriority} onValueChange={setTaskPriority}>
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
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateTaskOpen(false)}>Отмена</Button>
                    <Button onClick={handleCreateTask} disabled={createTaskLoading || !taskName.trim()}>
                      {createTaskLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Создать
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {tasksLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="py-3"><Skeleton className="h-5 w-48" /></CardContent></Card>
              ))}
            </div>
          ) : tasksList?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ListTodo className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Нет задач</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {tasksList?.map((task: Task) => (
                <Card key={task.id} className="hover:border-border transition-colors">
                  <CardContent className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge className={`${statusColor(task.status)} text-xs shrink-0`}>
                        {statusLabel(task.status)}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
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
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {priorityLabel(task.priority)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={task.status}
                        onValueChange={(s) => handleStatusChange(task.id, s)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">К выполнению</SelectItem>
                          <SelectItem value="in_progress">В работе</SelectItem>
                          <SelectItem value="review">На проверке</SelectItem>
                          <SelectItem value="completed">Выполнена</SelectItem>
                          <SelectItem value="blocked">Заблокирована</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Участники ({project.members.length})</h3>
            {project.can_manage_members && (
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить участника</DialogTitle>
                    <DialogDescription>Участник должен быть в команде {project.team_name}</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Username</Label>
                      <Input
                        value={memberUsername}
                        onChange={(e) => setMemberUsername(e.target.value)}
                        placeholder="username"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Роль</Label>
                      <Select value={memberRole} onValueChange={setMemberRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developer">Разработчик</SelectItem>
                          <SelectItem value="manager">Менеджер</SelectItem>
                          <SelectItem value="observer">Наблюдатель</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Отмена</Button>
                    <Button onClick={handleAddMember} disabled={addMemberLoading}>
                      {addMemberLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Добавить
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
                          {member.first_name[0]}{member.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">@{member.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.can_manage_members && member.role !== "owner" && member.username !== user?.username ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(role) => {
                              projects.updateMember(slug, member.username, role).then(() => {
                                toast.success("Роль изменена");
                                mutateProject();
                              }).catch((err: unknown) => {
                                if (err instanceof ApiError) toast.error(err.detail);
                              });
                            }}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="developer">Разработчик</SelectItem>
                              <SelectItem value="manager">Менеджер</SelectItem>
                              <SelectItem value="observer">Наблюдатель</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.username)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          {roleIcon(member.role)}
                          {roleLabel(member.role)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
