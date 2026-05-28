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

function isOwnTask(
  task: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  const assignee = String(
    task.assignee_username ?? task.assignee ?? "",
  ).trim();
  const user = String(currentUsername ?? "").trim();
  return assignee !== "" && assignee === user;
}

function isManagerLike(role: string | undefined): boolean {
  const r = n(role);
  return r === "owner" || r === "manager" || r === "senior_manager";
}

export function isProjectReadOnlyRole(role: string | undefined): boolean {
  const r = n(role);
  return r === "analyst" || r === "accountant" || r === "observer";
}

export function canAssignProjectTasks(userRole: string | undefined): boolean {
  return isManagerLike(userRole);
}

export function canEditTaskFieldsAdmin(
  userRole: string | undefined,
  task?: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  if (isManagerLike(userRole)) return true;
  if (n(userRole) === "intern" && task && currentUsername) {
    return isOwnTask(task, currentUsername);
  }
  return false;
}

export function canCreateTasksInProject(userRole: string | undefined): boolean {
  return isManagerLike(userRole);
}

export function canManageTaskGraph(userRole: string | undefined): boolean {
  return isManagerLike(userRole);
}

export function canEditTaskDescription(
  userRole: string | undefined,
  task?: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  return canEditTaskFieldsAdmin(userRole, task, currentUsername);
}

export function canChangeTaskStatus(
  userRole: string | undefined,
  task?: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  const r = n(userRole);
  if (isManagerLike(userRole)) return true;
  if (r === "developer") return true;
  if (r === "intern" && task && currentUsername) {
    return isOwnTask(task, currentUsername);
  }
  return false;
}

export function isProjectStatusOnlyRole(
  userRole: string | undefined,
): boolean {
  const r = n(userRole);
  return r === "developer";
}

export function isProjectObserver(userRole: string | undefined): boolean {
  return n(userRole) === "observer";
}

export function canDeleteTask(
  userRole: string | undefined,
  _task: { creator_username?: string },
  _currentUsername: string | undefined,
): boolean {
  return isManagerLike(userRole);
}

/** Resolve effective edit permission using backend flag + role rules. */
export function resolveCanEditTask(
  backendFlag: boolean | undefined,
  userRole: string | undefined,
  task: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  if (isProjectReadOnlyRole(userRole)) return false;
  if (backendFlag === false) return false;
  if (backendFlag === true) {
    if (n(userRole) === "intern") return isOwnTask(task, currentUsername);
    return canEditTaskFieldsAdmin(userRole, task, currentUsername);
  }
  return canEditTaskFieldsAdmin(userRole, task, currentUsername);
}

export function resolveCanChangeTaskStatus(
  backendFlag: boolean | undefined,
  userRole: string | undefined,
  task: { assignee_username?: string | null; assignee?: string | null },
  currentUsername?: string | null,
): boolean {
  if (isProjectReadOnlyRole(userRole)) return false;
  if (backendFlag === false) return false;
  if (backendFlag === true) {
    if (n(userRole) === "intern") return isOwnTask(task, currentUsername);
    return canChangeTaskStatus(userRole, task, currentUsername);
  }
  return canChangeTaskStatus(userRole, task, currentUsername);
}
