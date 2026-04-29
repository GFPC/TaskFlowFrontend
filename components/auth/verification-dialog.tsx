"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

interface Props {
  userId: number;
  emailSent: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

export function VerificationDialog({
  userId,
  emailSent,
  onSuccess,
  onClose,
}: Props) {
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await verifyEmail(userId, code);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error("Ошибка верификации");
      }
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Подтверждение email
          </DialogTitle>
          <DialogDescription className="text-balance">
            Введите 6-значный код из письма. Проверьте папку «Спам», если письма
            нет во входящих.
            {!emailSent && (
              <span className="mt-2 block text-amber-600 dark:text-amber-500">
                Уведомление о доставке письма не получено — если код не приходит,
                проверьте адрес email и настройки почты.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-sm text-muted-foreground">Код из письма</p>
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Подтвердить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
