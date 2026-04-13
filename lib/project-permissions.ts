/** Владелец и менеджер: исполнитель, название, приоритет, дедлайн. */
export function canAssignProjectTasks(userRole: string | undefined): boolean {
  return userRole === "owner" || userRole === "manager";
}

/** Название, приоритет, дедлайн — только владелец и менеджер. */
export function canEditTaskFieldsAdmin(userRole: string | undefined): boolean {
  return userRole === "owner" || userRole === "manager";
}

/** Описание — владелец, менеджер, разработчик. */
export function canEditTaskDescription(userRole: string | undefined): boolean {
  return (
    userRole === "owner" ||
    userRole === "manager" ||
    userRole === "developer"
  );
}

/** Смена статуса — все, кроме наблюдателя. */
export function canChangeTaskStatus(userRole: string | undefined): boolean {
  return userRole !== "observer" && userRole !== undefined;
}

export function isProjectObserver(userRole: string | undefined): boolean {
  return userRole === "observer";
}

export function canDeleteTask(
  userRole: string | undefined,
  task: { creator_username?: string },
  currentUsername: string | undefined,
): boolean {
  if (!userRole || userRole === "observer") return false;
  if (userRole === "owner" || userRole === "manager") return true;
  if (userRole === "developer") {
    return (
      !!currentUsername && task.creator_username === currentUsername
    );
  }
  return false;
}
