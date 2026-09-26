'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorMessage } from '@/components/admin/page-header';
import {
  notificationLink,
  notificationTypeLabel,
  severityLabel,
  severityVariant,
} from '@/components/notifications/notification-labels';
import { getErrorMessage } from '@/lib/api/client';
import { NotificationPreferences, notificationsApi } from '@/lib/api/notifications';
import { formatDateTime } from '@/lib/format';
import { translateNotificationText } from '@/lib/server-texts';
import { canUseAdmin, useAuthStore } from '@/stores/auth-store';
import { plural, t } from '@/i18n';

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsCentre />
    </ProtectedRoute>
  );
}

function NotificationsCentre() {
  const user = useAuthStore((state) => state.user);
  const backHref = canUseAdmin(user) ? '/admin' : '/pos';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {t('Back')}
        </Link>
        <NotificationList />
        <PreferencesCard />
      </div>
    </div>
  );
}

function NotificationList() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'page', unreadOnly, page],
    queryFn: () => notificationsApi.list({ unreadOnly, page, limit: 25 }),
    placeholderData: (previous) => previous,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: notificationsApi.markRead, onSuccess: refresh });
  const markAll = useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: refresh });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{t('Notifications')}</CardTitle>
          <CardDescription>
            {t('Alerts about stock, approvals, cash, payments, devices and the system. Reading one acknowledges it for everyone who received it.')}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Select
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(e) => {
              setUnreadOnly(e.target.value === 'unread');
              setPage(1);
            }}
            aria-label={t('Show')}
            className="w-36"
          >
            <option value="unread">{t('Unread')}</option>
            <option value="all">{t('All')}</option>
          </Select>
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" />
            {t('Mark all as read')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <ErrorMessage>{getErrorMessage(error, 'Could not load notifications')}</ErrorMessage>}
        {isLoading ? (
          <p className="text-sm text-gray-500">{t('Loading...')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">{unreadOnly ? t('No unread notifications.') : t('No notifications yet.')}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {rows.map((n) => {
              const href = notificationLink(n.type);
              return (
                <li key={n.id} className={n.readAt ? 'bg-gray-50 p-3' : 'p-3'}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityVariant(n.severity)}>{severityLabel(n.severity)}</Badge>
                        <span className="text-sm font-semibold">{notificationTypeLabel(n.type)}</span>
                        {n.occurrences > 1 && (
                          <span className="text-xs text-gray-500">{plural(n.occurrences, '{count} time', '{count} times')}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800">{translateNotificationText(n.title)}</p>
                      {n.body && <p className="whitespace-pre-line text-xs text-gray-600">{translateNotificationText(n.body)}</p>}
                      <p className="text-xs text-gray-400">
                        {formatDateTime(n.lastOccurredAt)}
                        {n.readAt && ` · ${t('Read {date}', { date: formatDateTime(n.readAt) })}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {href && canOpen(href) && (
                        <Link href={href} className="text-xs font-medium text-blue-600 hover:underline">
                          {t('Open')}
                        </Link>
                      )}
                      {!n.readAt && (
                        <button
                          type="button"
                          className="text-xs text-gray-500 hover:text-gray-800"
                          onClick={() => markRead.mutate(n.id)}
                        >
                          {t('Mark as read')}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm text-gray-600">
            <span>{t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Previous')}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
                {t('Next')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Admin links only make sense for people who can open the admin area
function canOpen(href: string) {
  return href.startsWith('/admin') ? canUseAdmin(useAuthStore.getState().user) : true;
}

function PreferencesCard() {
  const queryClient = useQueryClient();
  const { data, error } = useQuery({ queryKey: ['notifications', 'preferences'], queryFn: notificationsApi.preferences });
  // Local edits; until the first one, the saved preferences
  const [edited, setEdited] = useState<NotificationPreferences | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draft: NotificationPreferences | null =
    edited ??
    (data
      ? {
          inApp: data.inApp,
          email: data.email,
          mutedTypes: data.mutedTypes,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          timezone: data.timezone,
        }
      : null);

  const save = useMutation({
    mutationFn: (input: NotificationPreferences) => notificationsApi.updatePreferences(input),
    onSuccess: async () => {
      setMessage(t('Preferences saved'));
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!draft || !data) {
    return error ? <ErrorMessage>{getErrorMessage(error, 'Could not load your preferences')}</ErrorMessage> : null;
  }
  const update = (patch: Partial<NotificationPreferences>) => {
    setMessage(null);
    setEdited({ ...draft, ...patch });
  };
  const toggleType = (type: string, on: boolean) =>
    update({ mutedTypes: on ? draft.mutedTypes.filter((m) => m !== type) : [...draft.mutedTypes, type] });
  const quiet = !!(draft.quietHoursStart && draft.quietHoursEnd);

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>{t('Notification preferences')}</CardTitle>
        <CardDescription>{t('Choose how you are told about alerts in this store.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.inApp} onChange={(e) => update({ inApp: e.target.checked })} />
            {t('Show the unread count on the bell')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.email}
              disabled={!data.emailAvailable}
              onChange={(e) => update({ email: e.target.checked })}
            />
            {t('Also send me an e-mail for new alerts')}
          </label>
          {!data.emailAvailable && (
            <p className="text-xs text-gray-500">{t('E-mail is not set up on this server.')}</p>
          )}
          <p className="text-xs text-gray-500">
            {t('E-mails only contain the alert title and a link, never customer or payment details.')}
          </p>
        </div>

        {data.types.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t('Alerts')}</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {data.types.map((type) => (
                <label key={type.type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!draft.mutedTypes.includes(type.type)}
                    onChange={(e) => toggleType(type.type, e.target.checked)}
                  />
                  {notificationTypeLabel(type.type)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={quiet}
              onChange={(e) =>
                update(
                  e.target.checked
                    ? {
                        quietHoursStart: '22:00',
                        quietHoursEnd: '07:00',
                        timezone: draft.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                      }
                    : { quietHoursStart: null, quietHoursEnd: null }
                )
              }
            />
            {t('Quiet hours (no e-mail)')}
          </label>
          {quiet && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>{t('From')}</span>
              <Input
                type="time"
                className="w-32"
                value={draft.quietHoursStart ?? ''}
                onChange={(e) => update({ quietHoursStart: e.target.value || null })}
                aria-label={t('Quiet hours start')}
              />
              <span>{t('to')}</span>
              <Input
                type="time"
                className="w-32"
                value={draft.quietHoursEnd ?? ''}
                onChange={(e) => update({ quietHoursEnd: e.target.value || null })}
                aria-label={t('Quiet hours end')}
              />
              {draft.timezone && <span className="text-xs text-gray-500">{draft.timezone}</span>}
            </div>
          )}
        </div>

        {save.error && <ErrorMessage>{getErrorMessage(save.error, 'Could not save your preferences')}</ErrorMessage>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
          {save.isPending ? t('Saving...') : t('Save preferences')}
        </Button>
      </CardContent>
    </Card>
  );
}
