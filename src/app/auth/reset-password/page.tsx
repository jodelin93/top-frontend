'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';
import { HelpLink } from '@/help/help-drawer';

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The two passwords are different' });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

/** New password from the e-mailed link (?token=…): works once, for 30 minutes */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token] = useState(() => searchParams.get('token') ?? '');
  // A new account's link (sent when the store added the person): first password
  const [setup] = useState(() => searchParams.get('setup') === '1');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // Keep the link's secret out of the address bar and the browser history
  useEffect(() => {
    if (searchParams.get('token')) window.history.replaceState(null, '', '/auth/reset-password');
  }, [searchParams]);

  const validLink = TOKEN.test(token);

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await authApi.resetPassword({ token, newPassword: data.password });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, 'This link is invalid or has expired. Ask for a new one.'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <LanguageSwitcher compact className="absolute right-4 top-4 bg-white" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">{setup ? t('Choose your password') : t('Choose a new password')}</CardTitle>
          {!done && validLink && (
            <CardDescription className="text-center">
              {setup
                ? t('At least 8 characters. Saving it confirms your e-mail address; then sign in with it.')
                : t('At least 8 characters. Once it is saved, every device signed in to your account is signed out.')}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4" data-testid="reset-done">
              <div className="flex gap-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{setup ? t('Your e-mail address is confirmed and your password is saved. Sign in with it.') : t('Your password has been changed. Sign in with your new password.')}</p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/login">{t('Sign in')}</Link>
              </Button>
            </div>
          ) : !validLink ? (
            <div className="space-y-4">
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {t('This link is invalid or has expired. Ask for a new one.')}
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">{t('Ask for a new link')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="space-y-1 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  <p>{error}</p>
                  <Link href="/auth/forgot-password" className="font-medium underline">
                    {t('Ask for a new link')}
                  </Link>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">{t('New password')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  disabled={isSubmitting}
                />
                {errors.password && <p className="text-sm text-red-600">{t(errors.password.message ?? '')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">{t('Confirm the new password')}</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirm')}
                  disabled={isSubmitting}
                />
                {errors.confirm && <p className="text-sm text-red-600">{t(errors.confirm.message ?? '')}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Saving...') : setup ? t('Save my password') : t('Save the new password')}
              </Button>
            </form>
          )}
        </CardContent>
        <div className="pb-4 text-center">
          <HelpLink topicId="auth-forgot-password" />
        </div>
      </Card>
    </div>
  );
}
