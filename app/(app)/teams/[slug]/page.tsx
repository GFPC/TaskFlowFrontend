"use client";

import { use } from "react";
import useSWR, { mutate } from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { teams, projects as projectsApi, ApiError, type TeamDetail } from "@/lib/api";
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
import { toast } from "sonner";
import { useState } from "react";
import {
  Users,
  FolderKanban,
  Plus,
  Crown,
  Shield,
  User,
  Copy,
  Check,
  Trash2,
  Settings,
  UserPlus,
  RefreshCw,
  Loader2,
  Clock,
} from "lucide-react";

export default function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const { data: team, isLoading, mutate: mutateTeam } = useSWR<TeamDetail>(
    `team-${slug}`,
    () => teams.get(slug),
    { dedupingInterval: 60000 }
  );

  const { data: teamProjects, isLoading: projectsLoading } = useSWR(
    team ? `team-projects-${slug}` : null,
    () => projectsApi.byTeam(slug),
    { dedupingInterval: 300000 }
  );

  const [inviteCodeData, setInviteCodeData] = useState<{ code: string; expires: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("member");
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleGetInviteCode = async (refresh = false) => {
    try {
      const res = await teams.getInviteCode(slug, refresh);
      setInviteCodeData({ code: res.invite_code, expires: res.expires_at });
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCodeData) return;
    await navigator.clipboard.writeText(inviteCodeData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async () => {
    if (!addMemberUsername.trim()) return;
    setAddMemberLoading(true);
    try {
      await teams.addMember(slug, { username: addMemberUsername.trim(), role: addMemberRole });
      toast.success("Участник добавлен");
      mutateTeam();
      setAddMemberOpen(false);
      setAddMemberUsername("");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (username: string) => {
    try {
      await teams.removeMember(slug, username);
      toast.success("Участник удален");
      mutateTeam();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleChangeRole = async (username: string, role: string) => {
    try {
      await teams.updateMember(slug, username, role);
      toast.success("Роль изменена");
      mutateTeam();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleDeleteTeam = async () => {
    if (deleteConfirm !== team?.name) return;
    try {
      await teams.delete(slug);
      mutate("teams");
      toast.success("Команда удалена");
      router.push("/teams");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">Команда не найдена</p>
          <Button className="mt-4" asChild>
            <Link href="/teams">К командам</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3.5 w-3.5 text-warning" />;
      case "admin": return <Shield className="h-3.5 w-3.5 text-primary" />;
      default: return <User className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case "owner": return "Владелец";
      case "admin": return "Админ";
      default: return "Участник";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{team.name}</h1>
          <p className="text-muted-foreground mt-1">{team.description || "Нет описания"}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              {roleIcon(team.user_role)}
              {roleLabel(team.user_role)}
            </Badge>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {team.members_count} участн.
            </span>
            <span className="flex items-center gap-1">
              <FolderKanban className="h-3.5 w-3.5" />
              {team.projects_count} проектов
            </span>
          </div>
        </div>
        {team.can_manage && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Удалить команду?</DialogTitle>
                <DialogDescription>
                  {"Введите название команды «"}{team.name}{"» для подтверждения. Это действие нельзя отменить."}
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={team.name}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Отмена</Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== team.name}
                  onClick={handleDeleteTeam}
                >
                  Удалить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">Проекты</TabsTrigger>
          <TabsTrigger value="members">Участники</TabsTrigger>
          {team.can_invite_members && <TabsTrigger value="invite">Приглашения</TabsTrigger>}
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Проекты команды</h3>
            {team.can_manage_projects && (
              <Button size="sm" asChild>
                <Link href={`/projects/new?team=${slug}`} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Новый проект
                </Link>
              </Button>
            )}
          </div>
          {projectsLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i}><CardHeader><Skeleton className="h-5 w-32" /></CardHeader></Card>
              ))}
            </div>
          ) : teamProjects?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Нет проектов</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {teamProjects?.map((p) => (
                <Link key={p.id} href={`/projects/${p.slug}`}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{p.name}</CardTitle>
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>
                          {p.status === "active" ? "Активный" : "В архиве"}
                        </Badge>
                      </div>
                      <CardDescription>{p.description || "Нет описания"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{p.members_count} участн.</span>
                      <span>{p.tasks_count} задач</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Участники ({team.members.length})</h3>
            {team.can_invite_members && (
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
                    <DialogDescription>Введите username пользователя</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Username</Label>
                      <Input
                        value={addMemberUsername}
                        onChange={(e) => setAddMemberUsername(e.target.value)}
                        placeholder="username"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Роль</Label>
                      <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Участник</SelectItem>
                          <SelectItem value="admin">Админ</SelectItem>
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
            {team.members
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
                      {team.can_manage && member.role !== "owner" && member.username !== user?.username ? (
                        <>
                          <Select
                            value={member.role}
                            onValueChange={(role) => handleChangeRole(member.username, role)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Участник</SelectItem>
                              <SelectItem value="admin">Админ</SelectItem>
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

        {/* Invitations Tab */}
        {team.can_invite_members && (
          <TabsContent value="invite" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Код приглашения</CardTitle>
                <CardDescription>Поделитесь кодом для вступления в команду (действует 1 час)</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {inviteCodeData ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-muted px-4 py-2 font-mono text-sm tracking-wider text-foreground">
                      {inviteCodeData.code}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyCode}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleGetInviteCode(true)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => handleGetInviteCode()}>
                    Получить код приглашения
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
