'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { memberName } from '@/components/admin/user-form-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { Member, usersApi } from '@/lib/api/users';
import { t } from '@/i18n';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'At least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserPasswordDialogProps {
  // Member whose password is reset; null keeps the dialog closed
  member: Member | null;
  onClose: () => void;
}

export function UserPasswordDialog({ member, onClose }: UserPasswordDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  useEffect(() => {
    if (member) {
      reset({ password: '', confirm: '' });
    }
  }, [member, reset]);

  const resetPassword = useMutation({
    mutationFn: (password: string) => usersApi.resetPassword(member!.id, password),
  });

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const onSubmit = async (data: PasswordFormData) => {
    setError(null);
    try {
      await resetPassword.mutateAsync(data.password);
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not reset password'));
    }
  };

  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Reset password')}</DialogTitle>
          <DialogDescription>
            {member &&
              t('Set a new password for {name}. Share it with them securely.', { name: memberName(member) })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>

          <Field label={t('New password')} htmlFor="new-password" error={errorText(errors.password?.message)}>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              autoFocus
            />
          </Field>
          <Field label={t('Confirm password')} htmlFor="confirm-password" error={errorText(errors.confirm?.message)}>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? t('Saving...') : t('Reset password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Validation messages are written in English in the schema; translated when shown
function errorText(message?: string) {
  return message ? t(message) : undefined;
}
