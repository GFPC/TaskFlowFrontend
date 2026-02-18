"use client";

import useSWR, { mutate } from "swr";
import { teams, projects, ApiError } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Mail, FolderKanban, Users } from "lucide-react";
import { toast } from "sonner";

export default function InvitationsPage() {
  const { data: teamInvites, isLoading: teamLoading } = useSWR("team-invites", () => teams.myInvitations());
  const { data: projectInvites, isLoading: projectLoading } = useSWR("project-invites", () => projects.myInvitations());

  const handleTeamAction = async (id: number, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') await teams.acceptInvitation(id);
      else await teams.declineInvitation(id);
      toast.success(action === 'accept' ? "Приглашение принято" : "Приглашение отклонено");
      mutate("team-invites");
      mutate("teams");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  const handleProjectAction = async (id: number, action: 'accept' | 'decline') => {
    try {
      if (action === 'accept') await projects.acceptInvitation(id);
      else await projects.declineInvitation(id);
      toast.success(action === 'accept' ? "Приглашение принято" : "Приглашение отклонено");
      mutate("project-invites");
      mutate("projects");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.detail);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Приглашения</h1>
        <p className="text-muted-foreground">Управляйте вашими приглашениями в команды и проекты</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" /> Команды
        </h2>
        <div className="grid gap-4">
          {teamInvites?.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">У вас нет приглашений в команды</p>
          ) : (
            teamInvites?.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{invite.team_name}</span>
                    <span className="text-xs text-muted-foreground">От: @{invite.invited_by_username} • Роль: {invite.proposed_role}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleTeamAction(invite.id, 'decline')}>
                      <X className="h-4 w-4 mr-1" /> Отклонить
                    </Button>
                    <Button size="sm" onClick={() => handleTeamAction(invite.id, 'accept')}>
                      <Check className="h-4 w-4 mr-1" /> Принять
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderKanban className="h-5 w-5" /> Проекты
        </h2>
        <div className="grid gap-4">
          {projectInvites?.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">У вас нет приглашений в проекты</p>
          ) : (
            projectInvites?.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex flex-col">
                    <span className="font-medium">{invite.project_name}</span>
                    <span className="text-xs text-muted-foreground">От: @{invite.invited_by_username} • Роль: {invite.proposed_role}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleProjectAction(invite.id, 'decline')}>
                      <X className="h-4 w-4 mr-1" /> Отклонить
                    </Button>
                    <Button size="sm" onClick={() => handleProjectAction(invite.id, 'accept')}>
                      <Check className="h-4 w-4 mr-1" /> Принять
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
