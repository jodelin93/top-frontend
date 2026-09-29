'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LogOut, Menu, ShieldCheck, ShoppingCart, X } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { canUseAdmin, hasAnyPermission, useAuthStore } from '@/stores/auth-store';
import { adminNav, adminNavLabel } from '@/lib/admin-nav';
import { cn } from '@/lib/utils';
import { roleLabel } from '@/lib/server-texts';
import { t } from '@/i18n';
import { HelpButton } from '@/help/help-drawer';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const canManage = canUseAdmin(user);
  // Phones: the sidebar is a drawer. It is open for the page it was opened on, so any
  // navigation closes it without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === pathname;
  const closeDrawer = () => setDrawerPath(null);


  // Cashiers only use the POS
  useEffect(() => {
    if (user && !canManage) {
      router.replace('/pos');
    }
  }, [user, canManage, router]);

  // Escape closes the drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerPath(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const pageTitle = adminNavLabel(pathname);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-100">
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden="true"
            onClick={closeDrawer}
          />
        )}
        <aside
          id="admin-sidebar"
          aria-label={t('Admin menu')}
          className={cn(
            // Phones: off-canvas drawer; md and up: the fixed sidebar
            'fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col border-r bg-white shadow-xl transition-[transform,visibility] duration-200',
            'md:sticky md:top-0 md:z-auto md:h-screen md:w-56 md:max-w-none md:translate-x-0 md:shadow-none md:transition-none md:visible',
            drawerOpen ? 'translate-x-0' : 'invisible -translate-x-full'
          )}
        >
          <div className="border-b px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{t('Admin')}</div>
              <div className="hidden items-center md:flex">
                <HelpButton className="h-8 w-8 text-gray-600" />
                <NotificationBell align="left" />
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 md:hidden"
                aria-label={t('Close menu')}
              >
                <X className="h-5 w-5" />
              </button>
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
                      onClick={closeDrawer}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 md:py-2',
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
            <HelpButton
              label
              onOpen={closeDrawer}
              className="h-auto w-full justify-start gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 md:py-2"
            />
            <Link
              href="/account/security"
              onClick={closeDrawer}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 md:py-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {t('Account security')}
            </Link>
            <Link
              href="/pos"
              onClick={closeDrawer}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 md:py-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {t('Back to POS')}
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 md:py-2"
            >
              <LogOut className="h-4 w-4" />
              {t('Sign out')}
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phones: compact top bar with the menu button */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-white px-2 md:hidden">
            <button
              type="button"
              onClick={() => setDrawerPath(pathname)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
              aria-label={t('Open menu')}
              aria-controls="admin-sidebar"
              aria-expanded={drawerOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1 truncate text-base font-semibold">
              {pageTitle ? t(pageTitle) : t('Admin')}
            </div>
            <HelpButton className="h-10 w-10 text-gray-700" />
            <NotificationBell />
          </header>
          <main className="min-w-0 flex-1 p-3 sm:p-4 md:overflow-auto md:p-6">{canManage ? children : null}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
