"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { tasks as tasksApi } from "@/lib/api"
import { toast } from "sonner"

interface Props {
  projectSlug: string
  open: boolean
  onClose: () => void
  onCreate: () => void
}

export function CreateTaskDialog({ projectSlug, open, onClose, onCreate }: Props) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("1")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return toast.error("Введите название")
    setLoading(true)
    try {
      await tasksApi.create(projectSlug, {
        name,
        description,
        priority: Number(priority),
        project_slug: projectSlug,
      })
      toast.success("Задача создана")
      setName("")
      setDescription("")
      setPriority("1")
      onCreate()
    } catch {
      toast.error("Ошибка создания задачи")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название задачи" />
          </div>
          <div>
            <Label>Описание</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание..." rows={3} />
          </div>
          <div>
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Низкий</SelectItem>
                <SelectItem value="1">Средний</SelectItem>
                <SelectItem value="2">Высокий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? "Создание..." : "Создать задачу"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
