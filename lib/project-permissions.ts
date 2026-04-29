/**
 * Приводит `user_role` из API к канонике фронта (`owner` | `manager` | `developer` | `observer`).
 * Нормализует регистр и частые алиасы бэкенда (`Member`, `Dev`, …).
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

/** Владелец и менеджер: исполнитель, название, приоритет, дедлайн. */
export function canAssignProjectTasks(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/** Название, приоритет, дедлайн — только владелец и менеджер. */
export function canEditTaskFieldsAdmin(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/** Создание задач — только владелец и менеджер (роль «разработчик» не создаёт). */
export function canCreateTasksInProject(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/** Связи на графе, удаление задач с графа, сохранение раскладки — владелец и менеджер. */
export function canManageTaskGraph(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/** Описание — только владелец и менеджер. */
export function canEditTaskDescription(userRole: string | undefined): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}

/**
 * Смена статуса: любая роль участника проекта (включая разработчика и наблюдателя).
 * Редактирование полей задачи и графа — только у владельца и менеджера.
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

/** Разработчик или наблюдатель: поля задачи только читают, статус могут менять. */
export function isProjectStatusOnlyRole(
  userRole: string | undefined,
): boolean {
  const r = n(userRole);
  return r === "developer" || r === "observer";
}

export function isProjectObserver(userRole: string | undefined): boolean {
  return n(userRole) === "observer";
}

/** Удаление задачи — только владелец и менеджер. */
export function canDeleteTask(
  userRole: string | undefined,
  _task: { creator_username?: string },
  _currentUsername: string | undefined,
): boolean {
  const r = n(userRole);
  return r === "owner" || r === "manager";
}