'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi, signInErrorMessage } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { homePath } from '@/lib/landing';
import { t } from '@/i18n';
import { HelpLink } from '@/help/help-drawer';

const mfaSchema = z.object({
  token: z.string().length(6, 'Token must be 6 digits'),
});

type MfaFormData = z.infer<typeof mfaSchema>;

export default function MfaVerifyPage() {
  const router = useRouter();
  const { setUser, setRequiresMfa } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
  });

  const onSubmit = async (data: MfaFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.verifyMfa(data.token);

      // Signed in: the API set the session cookie; keep the profile
      if (response.user) {
        setUser(response.user);
      }
      setRequiresMfa(false);
      router.push(homePath(response.user ?? null));
    } catch (err) {
      setError(signInErrorMessage(err, 'Invalid verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('Two-Factor Authentication')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('Enter the 6-digit code from your authenticator app')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="token">{t('Verification Code')}</Label>
              <Input
                id="token"
                type="text"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
                {...register('token')}
                disabled={isLoading}
              />
              {errors.token && (
                <p className="text-sm text-red-600">{t(errors.token.message ?? '')}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('Verifying...') : t('Verify')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/auth/login')}
            >
              {t('Back to Login')}
            </Button>
          </form>
        </CardContent>
        <div className="pb-4 text-center">
          <HelpLink topicId="auth-mfa" />
        </div>
      </Card>
    </div>
  );
}
