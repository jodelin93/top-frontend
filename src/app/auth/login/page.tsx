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
import { BrandMark } from '@/components/brand-mark';
import { authApi, signInErrorMessage } from '@/lib/api/auth';
import { tenantsApi } from '@/lib/api/tenants';
import { useAuthStore } from '@/stores/auth-store';
import { homePath } from '@/lib/landing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';
import { HelpLink } from '@/help/help-drawer';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setRequiresMfa } = useAuthStore();
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
        // The API keeps the temporary token in a short-lived HttpOnly cookie
        setRequiresMfa(true);
        router.push('/auth/mfa-verify');
      } else {
        // Signed in: the session is an HttpOnly cookie; keep the profile
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" aria-label="Joda POS">
          <BrandMark size="sm" />
        </Link>
        <LanguageSwitcher compact className="bg-white" />
      </div>
      {/* The sheet on the press, with its crop marks */}
      <div className="crop-marks w-full max-w-md">
        <span className="crop crop-tl" aria-hidden />
        <span className="crop crop-tr" aria-hidden />
        <span className="crop crop-bl" aria-hidden />
        <span className="crop crop-br" aria-hidden />
        <div className="bg-white px-6 pb-6 pt-8 shadow-[0_1px_2px_rgba(23,34,53,0.08),0_16px_40px_-28px_rgba(23,34,53,0.5)] sm:px-9 sm:pt-10">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">{t('Sign in')}</h1>
          <p className="mt-2 text-gray-600">
            {t('Enter your email and password to access your account')}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('Password')}</Label>
                <Link href="/auth/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                  {t('Forgot password?')}
                </Link>
              </div>
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
          <div className="mt-6 border-t border-gray-200 pt-4 text-center">
            <HelpLink topicId="auth-login" />
          </div>
        </div>
      </div>
    </div>
  );
}
