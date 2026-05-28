import type { TaskEvent } from "@/lib/api";

const FIELD_LABELS: Record<string, string> = {
  name: "Название",
  description: "Описание",
  assignee: "Исполнитель",
  deadline: "Дедлайн",
  priority: "Приоритет",
  metadata: "Метаданные",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: "Создана",
  updated: "Изменение",
  status_changed: "Статус изменён",
  deleted: "Удалена",
  dependency_added: "Зависимость добавлена",
  dependency_removed: "Зависимость удалена",
  dependency_updated: "Зависимость изменена",
  comment_added: "Комментарий добавлен",
  comment_updated: "Комментарий изменён",
  comment_deleted: "Комментарий удалён",
};

function metaStr(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  if (!metadata) return undefined;
  const v = metadata[key];
  if (v == null) return undefined;
  return String(v);
}

function formatValue(field: string | null | undefined, value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  if (field === "priority") {
    const map: Record<string, string> = { "0": "Низкий", "1": "Средний", "2": "Высокий" };
    return map[value] ?? value;
  }
  if (field === "deadline") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("ru", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return value;
}

/** Human-readable description for a task event. */
export function formatTaskEventMessage(event: TaskEvent): string {
  const type = event.event_type;

  if (type === "created") {
    return "Создана";
  }

  if (type === "updated" && event.field) {
    const label = FIELD_LABELS[event.field] ?? event.field;
    const oldV = formatValue(event.field, event.old_value);
    const newV = formatValue(event.field, event.new_value);
    return `${label}: ${oldV} → ${newV}`;
  }

  if (type === "status_changed") {
    const oldV = event.old_value ?? "—";
    const newV = event.new_value ?? "—";
    return `Статус: ${oldV} → ${newV}`;
  }

  if (type === "deleted") {
    const taskName = metaStr(event.metadata, "task_name");
    const taskId = metaStr(event.metadata, "task_id") ?? (event.task_id != null ? String(event.task_id) : undefined);
    if (taskName && taskId) return `Удалена задача «${taskName}» (№${taskId})`;
    if (taskName) return `Удалена задача «${taskName}»`;
    if (taskId) return `Удалена задача №${taskId}`;
    return "Удалена";
  }

  if (type.startsWith("dependency_")) {
    const targetName = metaStr(event.metadata, "target_task_name");
    const sourceName = metaStr(event.metadata, "source_task_name");
    const depType = metaStr(event.metadata, "dependency_type");
    const base = EVENT_TYPE_LABELS[type] ?? type;
    const parts: string[] = [base];
    if (targetName) parts.push(`→ «${targetName}»`);
    else if (sourceName) parts.push(`← «${sourceName}»`);
    if (depType) parts.push(`(${depType})`);
    return parts.join(" ");
  }

  if (type.startsWith("comment_")) {
    const noteId = metaStr(event.metadata, "note_id");
    const base = EVENT_TYPE_LABELS[type] ?? type;
    return noteId ? `${base} (заметка №${noteId})` : base;
  }

  return EVENT_TYPE_LABELS[type] ?? type;
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
