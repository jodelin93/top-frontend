'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/admin/page-header';
import { signInErrorMessage } from '@/lib/api/auth';
import { getErrorCode } from '@/lib/api/client';
import { tenantsApi } from '@/lib/api/tenants';
import { useAuthStore } from '@/stores/auth-store';
import { LanguageSwitcher } from '@/components/language-switcher';
import { t } from '@/i18n';

const signupSchema = z.object({
  storeName: z.string().trim().min(2, 'Enter your store name').max(255),
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'At least 8 characters').max(128),
  currencyCode: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code, e.g. USD'),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { setUser, setRequiresMfa } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  // Existing account with two-factor on: the server asks for a current code (MFA_REQUIRED)
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const { data: enabled, isLoading } = useQuery({
    queryKey: ['signup-enabled'],
    queryFn: tenantsApi.signupEnabled,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { storeName: '', firstName: '', lastName: '', email: '', password: '', currencyCode: 'USD' },
  });

  const onSubmit = async (data: SignupFormData) => {
    setError(null);
    if (needsMfa && mfaCode.length !== 6) {
      setError(t('Enter the 6-digit code from your authenticator app'));
      return;
    }
    try {
      const response = await tenantsApi.signup({
        storeName: data.storeName,
        email: data.email,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        currencyCode: data.currencyCode.toUpperCase(),
        ...(needsMfa && { mfaCode }),
      });
      // Signed in: the API set the session cookie
      setRequiresMfa(false);
      if (response.user) setUser(response.user);
      // The new store already has a branch, register and payment methods
      router.push('/admin/settings');
    } catch (err) {
      if (getErrorCode(err) === 'MFA_REQUIRED') {
        setNeedsMfa(true);
        setMfaCode('');
      }
      setError(signInErrorMessage(err, 'Could not create the store'));
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <LanguageSwitcher compact className="absolute right-4 top-4 bg-white" />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">{t('Create your store')}</CardTitle>
          <CardDescription className="text-center">
            {t('You become the owner. A branch, a register and Cash/Card payments are set up for you.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-gray-400">{t('Loading...')}</p>
          ) : !enabled ? (
            <div className="space-y-4 text-center text-sm text-gray-600">
              <p>{t('Sign-up is not available on this server. Ask your administrator for an account.')}</p>
              <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
                {t('Back to sign in')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
              <Field label={t('Store name')} htmlFor="storeName" error={errors.storeName?.message && t(errors.storeName.message)}>
                <Input id="storeName" autoFocus {...register('storeName')} />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('First name')} htmlFor="firstName" error={errors.firstName?.message && t(errors.firstName.message)}>
                  <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
                </Field>
                <Field label={t('Last name')} htmlFor="lastName" error={errors.lastName?.message && t(errors.lastName.message)}>
                  <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
                </Field>
              </div>
              <Field label={t('Email')} htmlFor="email" error={errors.email?.message && t(errors.email.message)}>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
              </Field>
              <Field
                label={t('Password')}
                htmlFor="password"
                error={errors.password?.message && t(errors.password.message)}
                hint={t('Already have an account? Use its email and current password to add this store to it.')}
              >
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              </Field>
              {needsMfa && (
                <Field
                  label={t('Two-factor code')}
                  htmlFor="mfaCode"
                  hint={t('This account uses two-factor authentication. Enter the 6-digit code from your authenticator app.')}
                >
                  <Input
                    id="mfaCode"
                    autoFocus
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    className="tracking-widest"
                  />
                </Field>
              )}
              <Field label={t('Currency')} htmlFor="currencyCode" error={errors.currencyCode?.message && t(errors.currencyCode.message)}>
                <Input id="currencyCode" maxLength={3} className="uppercase" {...register('currencyCode')} />
              </Field>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t('Creating store...') : t('Create store')}
              </Button>
              <p className="text-center text-sm text-gray-600">
                {t('Already have a store?')}{' '}
                <Link href="/auth/login" className="font-medium text-blue-600 hover:underline">
                  {t('Sign in')}
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
