"use client"

import { useAuth } from "@/lib/auth-context"
import { useState } from "react"
import { users } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { User, Key, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.first_name || "")
  const [lastName, setLastName] = useState(user?.last_name || "")
  const [saving, setSaving] = useState(false)

  const [oldPass, setOldPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")
  const [changingPass, setChangingPass] = useState(false)

  async function handleUpdateProfile() {
    setSaving(true)
    try {
      await users.updateMe({ first_name: firstName, last_name: lastName })
      toast.success("Профиль обновлён")
      refreshUser()
    } catch {
      toast.error("Ошибка обновления профиля")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPass !== confirmPass) return toast.error("Пароли не совпадают")
    if (newPass.length < 8) return toast.error("Минимум 8 символов")
    setChangingPass(true)
    try {
      await users.changePassword({ current_password: oldPass, new_password: newPass })
      toast.success("Пароль изменён")
      setOldPass("")
      setNewPass("")
      setConfirmPass("")
    } catch {
      toast.error("Ошибка смены пароля")
    } finally {
      setChangingPass(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground">Управление аккаунтом</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Личные данные
          </CardTitle>
          <CardDescription>Обновите свои личные данные</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={user.username} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Имя</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Фамилия</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleUpdateProfile} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Смена пароля
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Текущий пароль</Label>
            <Input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} />
          </div>
          <div>
            <Label>Новый пароль</Label>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <div>
            <Label>Подтвердите пароль</Label>
            <Input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPass}>
            {changingPass ? "Изменение..." : "Изменить пароль"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
