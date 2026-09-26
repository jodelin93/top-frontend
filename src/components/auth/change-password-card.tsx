'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import * as z from 'zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { t } from '@/i18n';

// Messages are written in English and translated when shown
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'At least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'Choose a password different from the current one',
    path: ['newPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

const EMPTY: PasswordFormData = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Change one's own password; every other session of the account is signed out. */
export function ChangePasswordCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema), defaultValues: EMPTY });

  const onSubmit = async (data: PasswordFormData) => {
    setError(null);
    setMessage(null);
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      reset(EMPTY);
      setMessage(t('Your password was changed. You were signed out on your other devices.'));
      // The other sessions were revoked
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not change your password'));
    }
  };

  const errorText = (text?: string) => (text ? t(text) : undefined);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-gray-500" />
          {t('Change password')}
        </CardTitle>
        <CardDescription>{t('Changing your password signs you out on your other devices.')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {message && (
            <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              {message}
            </div>
          )}
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('Current password')} htmlFor="currentPassword" error={errorText(errors.currentPassword?.message)}>
            <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
          </Field>
          <Field label={t('New password')} htmlFor="newPassword" error={errorText(errors.newPassword?.message)}>
            <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
          </Field>
          <Field label={t('Confirm password')} htmlFor="confirmPassword" error={errorText(errors.confirmPassword?.message)}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('Saving...') : t('Change password')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
