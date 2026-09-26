'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LogOut, ShieldCheck, ShoppingCart } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { canUseAdmin, hasAnyPermission, useAuthStore } from '@/stores/auth-store';
import { adminNav } from '@/lib/admin-nav';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/server-texts';
import { t } from '@/i18n';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const canManage = canUseAdmin(user);


  // Cashiers only use the POS
  useEffect(() => {
    if (user && !canManage) {
      router.replace('/pos');
    }
  }, [user, canManage, router]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-100">
        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r bg-white">
          <div className="border-b px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{t('Admin')}</div>
              <NotificationBell align="left" />
            </div>
            {user && (
              <div className="truncate text-xs text-gray-500">
                {user.email} · {roleLabel(user.roleName ?? user.role)}
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {adminNav.map(({ section, items }) => {
              const visible = items.filter((item) => hasAnyPermission(user, ...item.permissions));
              if (visible.length === 0) return null;
              return (
                <div key={section} className="pb-2">
                  <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {t(section)}
                  </div>
                  {visible.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100',
                        pathname.startsWith(href) && 'bg-blue-50 text-blue-700 hover:bg-blue-50'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(label)}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="space-y-1 border-t p-2">
            <LanguageSwitcher />
            <Link
              href="/account/security"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <ShieldCheck className="h-4 w-4" />
              {t('Account security')}
            </Link>
            <Link
              href="/pos"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <ShoppingCart className="h-4 w-4" />
              {t('Back to POS')}
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              {t('Sign out')}
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-6">{canManage ? children : null}</main>
      </div>
    </ProtectedRoute>
  );
}
