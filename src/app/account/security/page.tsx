'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LogOut, Monitor, ShieldAlert, ShieldCheck, ShieldOff, Store } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { ChangePasswordCard } from '@/components/auth/change-password-card';
import { PendingInvitations } from '@/components/auth/pending-invitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorMessage } from '@/components/admin/page-header';
import { authApi, MfaSetupResponse } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { describeUserAgent, sessionsApi } from '@/lib/api/sessions';
import { formatDateTime } from '@/lib/format';
import { canUseAdmin, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';
import { roleLabel } from '@/lib/server-texts';

type Step = 'idle' | 'scan' | 'disable';

export default function SecurityPage() {
  return (
    <ProtectedRoute>
      <SecuritySettings />
    </ProtectedRoute>
  );
}

function SecuritySettings() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { data: profile } = useQuery({ queryKey: ['me'], queryFn: authApi.getCurrentUser });
  const mfaEnabled = profile?.mfaEnabled ?? user?.mfaEnabled ?? false;
  // Store policy: this role must turn on two-factor before using anything else
  const mfaRequired = !!(profile?.mfaSetupRequired ?? user?.mfaSetupRequired);

  const [step, setStep] = useState<Step>('idle');
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const markMfa = async (enabled: boolean) => {
    if (user) setUser({ ...user, mfaEnabled: enabled });
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const startSetup = () =>
    run(async () => {
      setSetup(await authApi.enableMfa());
      setCode('');
      setMessage(null);
      setStep('scan');
    }, 'Could not start two-factor setup');

  const confirmSetup = () =>
    run(async () => {
      const result = await authApi.confirmMfa(code.trim());
      // The API re-issued an unrestricted session cookie
      if (result.session?.user) setUser({ ...result.session.user, mfaEnabled: true });
      await markMfa(true);
      await queryClient.invalidateQueries();
      setStep('idle');
      setSetup(null);
      setMessage(t('Two-factor authentication is on. You will be asked for a code each time you sign in.'));
    }, 'That code is not valid. Check the time on your phone and try again.');

  const disable = () =>
    run(async () => {
      await authApi.disableMfa(code.trim());
      await markMfa(false);
      setStep('idle');
      setMessage(t('Two-factor authentication is off.'));
    }, 'That code is not valid');

  const backHref = canUseAdmin(user) ? '/admin' : '/pos';

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      <div className="mx-auto max-w-xl space-y-4">
        {!mfaRequired && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            {t('Back')}
          </Link>
        )}

        {mfaRequired && (
          <div role="alert" className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">{t('Two-factor authentication is required')}</p>
              <p>
                {t('Your store requires two-factor authentication for staff who manage users, roles, settings or the audit log. Turn it on below to continue.')}
              </p>
            </div>
          </div>
        )}

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mfaEnabled ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-gray-400" />}
              {t('Two-factor authentication')}
            </CardTitle>
            <CardDescription>
              {t('Protect {account} with a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, ...).', {
                account: user?.email ?? t('your account'),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{message}</div>}
            <ErrorMessage>{error}</ErrorMessage>

            {step === 'idle' && (
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {t('Status:')} <strong>{mfaEnabled ? t('On') : t('Off')}</strong>
                </span>
                {mfaEnabled ? (
                  <Button variant="outline" onClick={() => { setStep('disable'); setCode(''); setMessage(null); }}>
                    {t('Turn off')}
                  </Button>
                ) : (
                  <Button onClick={startSetup} disabled={busy}>
                    {busy ? t('Starting...') : t('Turn on')}
                  </Button>
                )}
              </div>
            )}

            {step === 'scan' && setup && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmSetup();
                }}
              >
                <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                  <li>{t('Open your authenticator app and scan this QR code.')}</li>
                  <li>{t('Enter the 6-digit code the app shows to finish.')}</li>
                </ol>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated by the API */}
                <img src={setup.qrCode} alt={t('QR code for your authenticator app')} className="mx-auto h-48 w-48" />
                <p className="text-center text-xs text-gray-500">
                  {t("Can't scan? Enter this key manually:")}
                  <span className="mt-1 block break-all font-mono text-sm text-gray-800">{setup.secret}</span>
                </p>
                <Input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  aria-label={t('Verification code')}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('idle')}>{t('Cancel')}</Button>
                  <Button type="submit" disabled={busy || code.length !== 6}>
                    {busy ? t('Verifying...') : t('Verify and turn on')}
                  </Button>
                </div>
              </form>
            )}

            {step === 'disable' && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  disable();
                }}
              >
                <p className="text-sm text-gray-700">{t('Enter a current code from your authenticator app to turn two-factor off.')}</p>
                <Input
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  aria-label={t('Verification code')}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('idle')}>{t('Cancel')}</Button>
                  <Button type="submit" variant="destructive" disabled={busy || code.length !== 6}>
                    {busy ? t('Turning off...') : t('Turn off')}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {!mfaRequired && mfaEnabled && message && (
          <Link href={backHref} className="block">
            <Button className="w-full">{t('Continue')}</Button>
          </Link>
        )}

        {/* Answering an invitation is not allowed until the required two-factor is on */}
        {!mfaRequired && <PendingInvitations />}
        <StoresCard />
        <ChangePasswordCard />
        <SessionsCard />
      </div>
    </div>
  );
}

// Switch between the stores this account belongs to
function StoresCard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const { data: stores = [] } = useQuery({ queryKey: ['auth', 'stores'], queryFn: authApi.stores });
  const switchStore = useMutation({
    mutationFn: authApi.switchStore,
    onSuccess: async (response) => {
      // The API re-issued the session cookie for the new store
      if (response.user) setUser(response.user);
      queryClient.clear();
      router.push(
        response.mfaSetupRequired
          ? '/account/security?mfaRequired=1'
          : response.user && canUseAdmin(response.user)
            ? '/admin'
            : '/pos'
      );
    },
  });

  if (stores.length < 2) return null;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-gray-500" />
          {t('Stores')}
        </CardTitle>
        <CardDescription>{t('Your account belongs to several stores. Choose the one to work in.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ErrorMessage>{switchStore.error && getErrorMessage(switchStore.error, 'Could not switch store')}</ErrorMessage>
        {stores.map((store) => (
          <div key={store.tenantId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{store.name}</div>
              <div className="text-xs text-gray-500">{roleLabel(store.roleName)}</div>
            </div>
            {store.current ? (
              <span className="text-xs font-medium text-green-700">{t('Current')}</span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={switchStore.isPending}
                onClick={() => switchStore.mutate(store.tenantId)}
              >
                {t('Switch')}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Signed-in sessions, with sign-out per session and "sign out everywhere else"
function SessionsCard() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();
  const router = useRouter();
  const { data: sessions = [], isLoading, error } = useQuery({ queryKey: ['sessions'], queryFn: sessionsApi.list });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sessions'] });
  const revoke = useMutation({
    mutationFn: sessionsApi.revoke,
    onSuccess: (_data, id) => {
      if (sessions.find((s) => s.id === id)?.current) {
        logout();
        router.push('/auth/login');
      } else {
        void refresh();
      }
    },
  });
  const revokeOthers = useMutation({ mutationFn: sessionsApi.revokeOthers, onSuccess: refresh });
  const others = sessions.filter((s) => !s.current).length;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-gray-500" />
          {t("Where you're signed in")}
        </CardTitle>
        <CardDescription>
          {t("Sign out anything you don't recognise. Sessions also end on their own when they expire.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ErrorMessage>
          {(error && getErrorMessage(error, 'Could not load your sessions')) ||
            ((revoke.error || revokeOthers.error) && getErrorMessage(revoke.error ?? revokeOthers.error, 'Could not sign out'))}
        </ErrorMessage>
        {isLoading ? (
          <p className="text-sm text-gray-400">{t('Loading...')}</p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium">
                    {describeUserAgent(session.userAgent)}
                    {session.current && <span className="ml-2 text-xs font-medium text-green-700">{t('This device')}</span>}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {t('Signed in {created} · last active {lastSeen}', {
                      created: formatDateTime(session.createdAt),
                      lastSeen: formatDateTime(session.lastSeenAt),
                    })}
                    {session.ip && ` · ${session.ip}`}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate(session.id)}
                  aria-label={session.current ? t('Sign out of this device') : t('Sign out this session')}
                >
                  <LogOut className="h-4 w-4" />
                  {t('Sign out')}
                </Button>
              </div>
            ))}
            {sessions.length === 0 && <p className="px-3 py-4 text-center text-gray-500">{t('No active sessions.')}</p>}
          </div>
        )}
        {others > 0 && (
          <Button variant="outline" className="w-full" disabled={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>
            {revokeOthers.isPending ? t('Signing out...') : t('Sign out everywhere else ({count})', { count: others })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
