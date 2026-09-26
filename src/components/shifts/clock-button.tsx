'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/client';
import { employeesApi } from '@/lib/api/employees';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Till header: clock the signed-in user's employee in or out. Hidden when the
 * account is not linked to an employee (or the API is unreachable).
 */
export function ClockButton({ branchId }: { branchId?: string | null }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ['employees', 'me', 'attendance'],
    queryFn: () => employeesApi.myAttendance(),
    retry: false,
    staleTime: 60_000,
  });
  if (!data?.employee || data.employee.status !== 'active') return null;

  const clockedIn = !!data.open;
  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await employeesApi.clock({ action: clockedIn ? 'out' : 'in', branchId: branchId ?? undefined });
      await queryClient.invalidateQueries({ queryKey: ['employees', 'me', 'attendance'] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not clock in or out'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn('h-7 text-xs', clockedIn && 'border-green-300 text-green-700', error && 'border-red-300')}
      onClick={toggle}
      disabled={busy}
      title={
        error ??
        (clockedIn && data.open
          ? t('Clocked in since {time}', { time: formatDateTime(data.open.clockIn) })
          : t('Start your working time'))
      }
    >
      <Clock className="h-3.5 w-3.5" />
      {clockedIn ? t('Clock out') : t('Clock in')}
    </Button>
  );
}
