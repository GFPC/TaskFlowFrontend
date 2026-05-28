/** Global user role display names (API v1.1.0). */
export const GLOBAL_ROLE_LABELS: Record<string, string> = {
  Стажер: "Стажер",
  Аналитик: "Аналитик",
  Бухгалтер: "Бухгалтер",
  "Старший менеджер": "Старший менеджер",
  Администратор: "Администратор",
  Пользователь: "Пользователь",
};

/** Project member role codes → Russian labels. */
export const PROJECT_ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  senior_manager: "Старший менеджер",
  developer: "Разработчик",
  intern: "Стажёр",
  analyst: "Аналитик",
  accountant: "Бухгалтер",
  observer: "Наблюдатель",
};

export const PROJECT_ROLE_OPTIONS = [
  "developer",
  "intern",
  "manager",
  "senior_manager",
  "analyst",
  "accountant",
  "observer",
] as const;

export function projectRoleLabel(role: string): string {
  return PROJECT_ROLE_LABELS[role] ?? role;
}

export function globalRoleLabel(role: string | undefined): string {
  if (!role) return "—";
  return GLOBAL_ROLE_LABELS[role] ?? role;
}
