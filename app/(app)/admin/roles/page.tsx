"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  rolesApi,
  meta,
  formatApiError,
  type Role,
  type PermissionMeta,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useUserPermissions } from "@/lib/user-permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Plus, Pencil, Loader2, AlertTriangle } from "lucide-react";

function permissionsToJson(perms: Record<string, boolean>): string {
  return JSON.stringify(perms);
}

function dictFromRole(role: Role): Record<string, boolean> {
  if (role.permissions_dict) return { ...role.permissions_dict };
  if (role.permissions) {
    try {
      const parsed = JSON.parse(role.permissions) as Record<string, boolean>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }
  return {};
}

export default function AdminRolesPage() {
  const { user } = useAuth();
  const { canManageRoles } = useUserPermissions(user);

  const {
    data: roles,
    isLoading,
    mutate,
  } = useSWR(canManageRoles ? "admin-roles" : null, () => rolesApi.list());

  const { data: permissionCatalog } = useSWR(
    canManageRoles ? "meta-permissions" : null,
    () => meta.permissions(),
  );

  const [editRole, setEditRole] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState("0");
  const [formPerms, setFormPerms] = useState<Record<string, boolean>>({});

  const openCreate = () => {
    setFormName("");
    setFormDescription("");
    setFormPriority("0");
    setFormPerms({});
    setCreateOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditRole(role);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormPriority(String(role.priority ?? 0));
    setFormPerms(dictFromRole(role));
  };

  const togglePerm = (code: string, checked: boolean) => {
    setFormPerms((prev) => ({ ...prev, [code]: checked }));
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await rolesApi.create({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        priority: Number(formPriority) || 0,
        permissions: permissionsToJson(formPerms),
      });
      toast.success("Роль создана");
      setCreateOpen(false);
      void mutate();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editRole || !formName.trim()) return;
    setSaving(true);
    try {
      await rolesApi.update(editRole.id, {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        priority: Number(formPriority) || 0,
        permissions: permissionsToJson(formPerms),
      });
      toast.success("Роль обновлена");
      setEditRole(null);
      void mutate();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!canManageRoles) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Недостаточно прав для управления ролями
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">На дашборд</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Роли пользователей
          </h1>
          <p className="text-muted-foreground mt-1">
            Глобальные роли и права доступа (API {/**/}v1.1.0)
          </p>
        </div>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Новая роль
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(roles ?? []).map((role) => (
            <Card key={role.id}>
              <CardHeader className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.description ? (
                      <CardDescription>{role.description}</CardDescription>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      Приоритет: {role.priority ?? 0}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => openEdit(role)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Изменить
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <PermissionBadges
                  perms={dictFromRole(role)}
                  catalog={permissionCatalog}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RoleFormDialog
        open={createOpen}
        title="Новая роль"
        formName={formName}
        formDescription={formDescription}
        formPriority={formPriority}
        formPerms={formPerms}
        permissionCatalog={permissionCatalog}
        saving={saving}
        onOpenChange={setCreateOpen}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onPriorityChange={setFormPriority}
        onTogglePerm={togglePerm}
        onSubmit={() => void handleCreate()}
      />

      <RoleFormDialog
        open={editRole != null}
        title={`Редактирование: ${editRole?.name ?? ""}`}
        formName={formName}
        formDescription={formDescription}
        formPriority={formPriority}
        formPerms={formPerms}
        permissionCatalog={permissionCatalog}
        saving={saving}
        onOpenChange={(o) => !o && setEditRole(null)}
        onNameChange={setFormName}
        onDescriptionChange={setFormDescription}
        onPriorityChange={setFormPriority}
        onTogglePerm={togglePerm}
        onSubmit={() => void handleUpdate()}
      />
    </div>
  );
}

function PermissionBadges({
  perms,
  catalog,
}: {
  perms: Record<string, boolean>;
  catalog?: PermissionMeta[];
}) {
  const active = Object.entries(perms).filter(([, v]) => v);
  if (active.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Нет назначенных прав</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {active.map(([code]) => {
        const metaItem = catalog?.find((p) => p.code === code);
        return (
          <span
            key={code}
            className="text-[11px] rounded-md bg-muted px-2 py-0.5 text-muted-foreground"
          >
            {metaItem?.display_name ?? metaItem?.label ?? code}
          </span>
        );
      })}
    </div>
  );
}

function RoleFormDialog({
  open,
  title,
  formName,
  formDescription,
  formPriority,
  formPerms,
  permissionCatalog,
  saving,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onPriorityChange,
  onTogglePerm,
  onSubmit,
}: {
  open: boolean;
  title: string;
  formName: string;
  formDescription: string;
  formPriority: string;
  formPerms: Record<string, boolean>;
  permissionCatalog?: PermissionMeta[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onTogglePerm: (code: string, checked: boolean) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={formName} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea
              value={formDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Приоритет</Label>
            <Input
              type="number"
              value={formPriority}
              onChange={(e) => onPriorityChange(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">Права</Label>
            <div className="space-y-2 max-h-[240px] overflow-y-auto rounded-lg border p-3">
              {(permissionCatalog ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Загрузка прав…</p>
              ) : (
                permissionCatalog!.map((p) => (
                  <label
                    key={p.code}
                    className="flex items-start gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={Boolean(formPerms[p.code])}
                      onCheckedChange={(c) =>
                        onTogglePerm(p.code, c === true)
                      }
                    />
                    <span>
                      <span className="font-medium">
                        {p.display_name ?? p.label ?? p.code}
                      </span>
                      {p.description ? (
                        <span className="block text-xs text-muted-foreground">
                          {p.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={onSubmit} disabled={saving || !formName.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
