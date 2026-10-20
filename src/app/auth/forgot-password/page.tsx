'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { LanguageSwitcher } from '@/components/language-switcher';
import { currentLang, t } from '@/i18n';
import { HelpLink } from '@/help/help-drawer';

const schema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

/**
 * Forgot password: asks for the account's e-mail; the server sends a link to
 * choose a new password. The same message shows whether the account exists or not.
 */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      // The e-mail is written in the language shown on this page
      await authApi.forgotPassword({ email: data.email, language: currentLang() });
      setSentTo(data.email);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not send the link. Try again in a moment.'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <LanguageSwitcher compact className="absolute right-4 top-4 bg-white" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">{t('Forgot your password?')}</CardTitle>
          <CardDescription className="text-center">
            {t('Enter the email of your account. We will send you a link to choose a new password.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <div className="space-y-4" data-testid="forgot-sent">
              <div className="flex gap-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
                <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  {t(
                    'If an account exists for {email}, a link to choose a new password is on its way. Check your inbox and your spam folder. The link expires in 30 minutes.',
                    { email: sentTo }
                  )}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {t('No email after a few minutes? Check the address, or ask a manager to set a new password for you (Users page).')}
              </p>
              <Button asChild className="w-full">
                <Link href="/auth/login">{t('Back to sign in')}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="email">{t('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-sm text-red-600">{t(errors.email.message ?? '')}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Sending...') : t('Send the link')}
              </Button>
              <p className="text-center text-sm">
                <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
                  {t('Back to sign in')}
                </Link>
              </p>
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
