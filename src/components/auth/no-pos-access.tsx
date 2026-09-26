'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { firstAdminHref } from '@/lib/landing';
import { useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';

/**
 * Shown on the till to a user whose role doesn't sell (no pos.sell): they are
 * sent on to the first admin page they may open, with a button in case the
 * redirect doesn't happen. Users with no admin page either get an explanation
 * and a sign-out button instead of a dead end.
 */
export function NoPosAccess() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const adminHref = firstAdminHref(user);

  useEffect(() => {
    if (adminHref) router.replace(adminHref);
  }, [adminHref, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow" role="alert">
        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
        <p className="mb-4 text-gray-800">
          {adminHref
            ? t('Your role does not include selling at the till.')
            : t('Your role gives you no access to the till or the administration. Ask a manager to check your permissions.')}
        </p>
        <div className="flex flex-col items-center gap-2">
          {adminHref && (
            <Button asChild>
              <Link href={adminHref}>{t('Go to administration')}</Link>
            </Button>
          )}
          <Button variant={adminHref ? 'ghost' : 'default'} onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {t('Sign out')}
          </Button>
        </div>
      </div>
    </div>
  );
}
