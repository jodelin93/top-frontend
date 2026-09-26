'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationsApi } from '@/lib/api/notifications';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';
import { notificationTypeLabel } from './notification-labels';
import { translateNotificationText } from '@/lib/server-texts';

// The count is refreshed this often while the page is open
const POLL_MS = 60_000;

/**
 * Bell with the number of unread notifications; opens the latest ones.
 * Used in the admin sidebar and the POS header.
 */
export function NotificationBell({ className, align = 'right' }: { className?: string; align?: 'left' | 'right' }) {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const { data: count } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    refetchInterval: POLL_MS,
    // A broken count must never get in the way of selling
    retry: false,
  });
  const { data: latest, isLoading } = useQuery({
    queryKey: ['notifications', 'latest'],
    queryFn: () => notificationsApi.list({ unreadOnly: true, limit: 8 }),
    enabled: !!user && open,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });

  // Close when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const unread = count?.unread ?? 0;
  const critical = (count?.critical ?? 0) > 0;
  const label = unread > 0 ? t('Notifications ({count} unread)', { count: unread }) : t('Notifications');

  return (
    <div ref={panel} className={cn('relative inline-block', className)}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white',
              critical ? 'bg-red-600' : 'bg-blue-600'
            )}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-80 rounded-md border bg-white shadow-lg',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          role="dialog"
          aria-label={t('Notifications')}
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">{t('Notifications')}</span>
            {unread > 0 && (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3 w-3" />
                {t('Mark all as read')}
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y overflow-y-auto">
            {isLoading ? (
              <li className="px-3 py-4 text-center text-sm text-gray-500">{t('Loading...')}</li>
            ) : !latest?.data.length ? (
              <li className="px-3 py-4 text-center text-sm text-gray-500">{t('No unread notifications.')}</li>
            ) : (
              latest.data.map((n) => (
                <li key={n.id} className="px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wide',
                          n.severity === 'critical' ? 'text-red-600' : n.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                        )}
                      >
                        {notificationTypeLabel(n.type)}
                      </div>
                      <div className="text-sm text-gray-800">{translateNotificationText(n.title)}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(n.lastOccurredAt)}</div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-gray-500 hover:text-gray-800"
                      onClick={() => markRead.mutate(n.id)}
                      title={t('Mark as read')}
                    >
                      {t('Dismiss')}
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
          <div className="border-t px-3 py-2 text-right">
            <Link
              href="/account/notifications"
              className="text-xs font-medium text-blue-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              {t('All notifications and preferences')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
