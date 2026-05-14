/**
 * Maps backend role aliases to the frontend project role set.
 */
export function normalizeProjectUserRole(
  role: string | undefined | null,
): string | undefined {
  if (role == null) return undefined;
  const r = String(role).trim().toLowerCase();
  if (r === "member" || r === "contributor" || r === "dev") return "developer";
  if (
    r === "viewer" ||
    r === "viewers" ||
    r === "watcher" ||
    r === "spectator"
  )
    return "observer";
  return r;
}

function n(role: string | undefined | null): string | undefined {
  return normalizeProjectUserRole(role);
}

export function canAssignProjectTasks(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

export function canEditTaskFieldsAdmin(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

export function canCreateTasksInProject(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

export function canManageTaskGraph(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

export function canEditTaskDescription(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/**
 * Any project role can change task status; field and graph edits are stricter.
 */
export function canChangeTaskStatus(
  userRole: string | undefined,
  _task?: { assignee_username?: string | null; assignee?: string | null },
  _currentUsername?: string | null,
): boolean {
  const r = n(userRole);
  return (
    r === "owner" ||
    r === "manager" ||
    r === "developer" ||
    r === "observer"
  );
}

export function isProjectStatusOnlyRole(
  userRole: string | undefined,
): boolean {
  const r = n(userRole);
  return r === "developer" || r === "observer";
}

export function isProjectObserver(userRole: string | undefined): boolean {
  return n(userRole) === "observer";
}

export function canDeleteTask(
  userRole: string | undefined,
  _task: { creator_username?: string },
  _currentUsername: string | undefined,
): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}