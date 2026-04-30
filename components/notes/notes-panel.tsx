"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Edit2, Loader2, MessageSquareText, Trash2 } from "lucide-react";
import {
  projects as projectsApi,
  formatApiError,
  type Note,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NotesPanelProps = {
  projectSlug: string;
  taskId?: number;
  currentUsername?: string | null;
  projectRole?: string;
  compact?: boolean;
};

function canManageNote(
  note: Note,
  currentUsername?: string | null,
  projectRole?: string,
) {
  const role = projectRole?.toLowerCase();
  return (
    note.author_username === currentUsername ||
    role === "owner" ||
    role === "manager"
  );
}

function formatNoteDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotesPanel({
  projectSlug,
  taskId,
  currentUsername,
  projectRole,
  compact = false,
}: NotesPanelProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [busyNoteId, setBusyNoteId] = useState<number | null>(null);

  const key = taskId
    ? (["task-notes", projectSlug, taskId] as const)
    : (["project-notes", projectSlug] as const);

  const {
    data: notes,
    isLoading,
    mutate,
  } = useSWR(key, () =>
    taskId
      ? projectsApi.taskNotes(projectSlug, taskId)
      : projectsApi.notes(projectSlug),
  );

  const sortedNotes = useMemo(
    () =>
      [...(notes ?? [])].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [notes],
  );

  const handleCreate = async () => {
    const text = content.trim();
    if (!text) return;

    setSaving(true);
    try {
      await (taskId
        ? projectsApi.createTaskNote(projectSlug, taskId, { content: text })
        : projectsApi.createNote(projectSlug, { content: text }));
      setContent("");
      await mutate();
      toast.success("Заметка добавлена");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingContent(note.content);
  };

  const handleUpdate = async (noteId: number) => {
    const text = editingContent.trim();
    if (!text) return;

    setBusyNoteId(noteId);
    try {
      await projectsApi.updateNote(projectSlug, noteId, { content: text });
      setEditingId(null);
      setEditingContent("");
      await mutate();
      toast.success("Заметка обновлена");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyNoteId(null);
    }
  };

  const handleDelete = async (noteId: number) => {
    setBusyNoteId(noteId);
    try {
      await projectsApi.deleteNote(projectSlug, noteId);
      await mutate();
      toast.success("Заметка удалена");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusyNoteId(null);
    }
  };

  return (
    <div className={cn("space-y-3", compact && "text-sm")}>
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            taskId ? "Добавьте заметку к задаче…" : "Добавьте заметку к проекту…"
          }
          rows={compact ? 2 : 3}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={saving || !content.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Добавить заметку
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <MessageSquareText className="h-8 w-8" />
            Заметок пока нет
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedNotes.map((note) => {
            const editable = canManageNote(note, currentUsername, projectRole);
            const isEditing = editingId === note.id;
            const busy = busyNoteId === note.id;

            return (
              <Card key={note.id} className="border-border/70">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {note.author_name || `@${note.author_username}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatNoteDate(note.created_at)}
                        {note.updated_at ? " · изменено" : ""}
                      </p>
                    </div>
                    {editable && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(note)}
                          disabled={busy}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(note.id)}
                          disabled={busy}
                        >
                          {busy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={compact ? 2 : 3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                        >
                          Отмена
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleUpdate(note.id)}
                          disabled={busy || !editingContent.trim()}
                        >
                          {busy && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {note.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
