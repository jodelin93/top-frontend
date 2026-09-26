'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi, signInErrorMessage } from '@/lib/api/auth';
import { tenantsApi } from '@/lib/api/tenants';
import { useAuthStore } from '@/stores/auth-store';
import { homePath } from '@/lib/landing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setTokens, setRequiresMfa } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Self-service store sign-up is offered only when the server allows it
  const { data: signupEnabled = false } = useQuery({
    queryKey: ['signup-enabled'],
    queryFn: tenantsApi.signupEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(data);

      if (response.requiresMfa) {
        // Store temporary token and redirect to MFA verification
        setTokens('', response.accessToken); // temp token
        setRequiresMfa(true);
        router.push('/auth/mfa-verify');
      } else {
        // Full access - store token and user
        setTokens(response.accessToken);
        if (response.user) {
          setUser(response.user);
        }
        // The store requires two-factor for this role: set it up before anything else.
        // Otherwise the till, or the admin area for users who don't sell (accountant...)
        router.push(
          response.mfaSetupRequired ? '/account/security?mfaRequired=1' : homePath(response.user ?? null)
        );
      }
    } catch (err) {
      setError(signInErrorMessage(err, 'Invalid credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <LanguageSwitcher compact className="absolute right-4 top-4 bg-white" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('Sign in to Modern POS')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('Enter your email and password to access your account')}
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
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{t(errors.email.message ?? '')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('Password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{t(errors.password.message ?? '')}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? t('Signing in...') : t('Sign in')}
            </Button>
          </form>
          {signupEnabled && (
            <p className="mt-4 text-center text-sm text-gray-600">
              {t('New here?')}{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                {t('Create a store')}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
