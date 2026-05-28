"use client";

import useSWR from "swr";
import { meta, type Role, type User } from "@/lib/api";

export type UserPermissions = Record<string, boolean>;

function roleName(user: User | null | undefined): string | undefined {
  return user?.role_name ?? user?.role;
}

function permissionsFromRoles(
  roles: Role[] | undefined,
  name: string | undefined,
): UserPermissions {
  if (!roles?.length || !name) return {};
  const match = roles.find((r) => r.name === name);
  return match?.permissions_dict ?? {};
}

export function hasPermission(
  perms: UserPermissions | undefined,
  code: string,
): boolean {
  return Boolean(perms?.[code]);
}

export function canViewReportsSection(perms: UserPermissions | undefined): boolean {
  return (
    hasPermission(perms, "view_reports") ||
    hasPermission(perms, "view_analytics") ||
    hasPermission(perms, "view_finance_reports")
  );
}

export function canViewReportOverview(perms: UserPermissions | undefined): boolean {
  return (
    hasPermission(perms, "view_reports") ||
    hasPermission(perms, "view_analytics") ||
    hasPermission(perms, "view_finance_reports")
  );
}

export function canViewReportThroughput(
  perms: UserPermissions | undefined,
): boolean {
  return hasPermission(perms, "view_analytics");
}

export function canManageRoles(
  user: User | null | undefined,
  perms: UserPermissions | undefined,
): boolean {
  return Boolean(user?.is_superuser) || hasPermission(perms, "manage_roles");
}

/** Load global user permissions from meta/user-roles catalog. */
export function useUserPermissions(user: User | null | undefined) {
  const { data: roleCatalog, isLoading } = useSWR(
    "meta-user-roles",
    () => meta.userRoles(),
    { revalidateOnFocus: false, dedupingInterval: 300000 },
  );

  const permissions = permissionsFromRoles(roleCatalog, roleName(user));

  return {
    permissions,
    roleCatalog,
    isLoading,
    canViewReports: canViewReportsSection(permissions),
    canViewOverview: canViewReportOverview(permissions),
    canViewThroughput: canViewReportThroughput(permissions),
    canManageRoles: canManageRoles(user, permissions),
  };
}
