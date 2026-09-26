'use client';

import { Clock, HardDrive, Lock, ShieldAlert, ShieldX, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeviceLease, useStorageStatus } from '@/hooks/use-pos-data';
import { deviceLost } from '@/lib/api/client';
import { hasAnyPermission, useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Offline lease status for the till (mounted once on the POS screen).
 * - Offline with a valid lease: a small notice with the time offline selling ends.
 * - Offline with an expired lease (or a revoked device): locks the till with an explanation.
 * - Offline with a clock that went backwards: locks the till until it is back online.
 * - Revoked device while online: a warning banner.
 * - Browser storage almost full: a warning banner (offline sales may not be saved).
 * - Till marked lost by an administrator (DEVICE_LOST): locks the till, no syncing, until
 *   a manager re-enrolls it (it then registers as a new device).
 */
export function OfflineLeaseGuard({ online, registerId }: { online: boolean; registerId: string | null }) {
  const { device, leaseExpiresAt, leaseExpired, leaseChecked, revoked, offlineBlocked, clockProblem, lost } =
    useDeviceLease(online, registerId);
  const user = useAuthStore((s) => s.user);
  const canEnroll = hasAnyPermission(user, 'devices.manage');
  const storage = useStorageStatus(0);
  const storageWarning = storage?.low ? (
    <div role="status" className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      <HardDrive className="h-4 w-4 shrink-0" />
      {t('This device is almost out of storage ({free} left). Upload offline sales and free up space, or new offline sales may not be saved.', {
        free: formatBytes(Math.max(0, storage.quota - storage.usage)),
      })}
    </div>
  ) : null;

  if (lost) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="device-lost-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4"
      >
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 text-center shadow-xl">
          <ShieldX className="mx-auto h-10 w-10 text-red-600" />
          <h2 id="device-lost-title" className="text-lg font-semibold">
            {t('This till was marked lost')}
          </h2>
          <p className="text-sm text-gray-700">
            {t('An administrator marked this till lost, so it can no longer sell or upload sales. Ask a manager to re-enroll it.')}{' '}
            {t('Sales still waiting on this device are kept on it.')}
          </p>
          {canEnroll ? (
            <Button onClick={() => deviceLost.clear()}>{t('Re-enroll this till')}</Button>
          ) : (
            <p className="text-xs text-gray-500">{t('A manager must sign in on this till to re-enroll it.')}</p>
          )}
        </div>
      </div>
    );
  }

  if (offlineBlocked) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-lock-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 p-4"
      >
        <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 text-center shadow-xl">
          <Lock className="mx-auto h-10 w-10 text-red-600" />
          <h2 id="offline-lock-title" className="text-lg font-semibold">
            {t('Offline selling is paused')}
          </h2>
          <p className="text-sm text-gray-700">
            {revoked
              ? t('An administrator revoked this till, so it cannot sell without a connection.')
              : clockProblem
                ? t("This till's clock went back in time, so offline sales can't be trusted. Check the date and time of the device.")
              : !device
                ? t('This till has not been registered for offline selling yet.')
                : leaseExpiresAt
                  ? t('This till was allowed to sell offline until {date}. That time has passed.', {
                      date: formatDateTime(leaseExpiresAt),
                    })
                  : t('This till has no offline permission yet.')}{' '}
            {t('Reconnect to the internet to continue selling. Sales already rung up are safe on this device and upload automatically.')}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <WifiOff className="h-4 w-4" /> {t('Waiting for a connection…')}
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t('Try again')}
          </Button>
        </div>
      </div>
    );
  }

  if (revoked) {
    return (
      <>
        <div role="status" className="flex items-center gap-2 bg-red-50 px-4 py-2 text-sm text-red-700">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          {t('This till was revoked by an administrator: it cannot sell offline. Ask a manager to restore it under Admin → Devices.')}
        </div>
        {storageWarning}
      </>
    );
  }

  if (!online && leaseChecked && !leaseExpired && leaseExpiresAt) {
    return (
      <>
        <div role="status" className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          {t('Offline: you can keep selling until {date}. Reconnect before then.', { date: formatDateTime(leaseExpiresAt) })}
        </div>
        {storageWarning}
      </>
    );
  }

  return storageWarning;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}
