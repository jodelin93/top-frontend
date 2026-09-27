'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  dialogStickyFooter,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { shiftsApi } from '@/lib/api/shifts';
import { kickDrawer } from '@/lib/pos/drawer';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Outcome = 'opened' | 'no_hardware' | 'failed';

/**
 * Till header: open the cash drawer without a sale ("no sale"). The reason is
 * required and recorded (audited) on the shift before the drawer is kicked.
 */
export function DrawerOpenButton({
  registerId,
  className,
}: {
  registerId: string | null | undefined;
  // Restyles the trigger (e.g. a full-width row in the till's phone menu)
  className?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const canOperate = hasPermission(user, 'shifts.operate');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);

  // Same query as the shift chip: shares its cache
  const { data } = useQuery({
    queryKey: ['shifts', 'current', registerId],
    queryFn: () => shiftsApi.current(registerId!),
    enabled: !!registerId && canOperate,
    retry: false,
    refetchInterval: 60_000,
  });
  const shift = data?.shift ?? null;
  if (!registerId || !canOperate || !shift || shift.status !== 'open') return null;

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setReason('');
      setError(null);
      setOutcome(null);
      setKey(newIdempotencyKey());
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await shiftsApi.drawerOpen(shift.id, { reason: reason.trim(), idempotencyKey: key });
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      const kick = await kickDrawer(key);
      setOutcome(kick.opened ? 'opened' : kick.supported ? 'failed' : 'no_hardware');
      if (kick.error) setError(kick.error);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the drawer opening'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn('h-7 text-xs', className)}
        onClick={() => setOpen(true)}
        title={t('Open the cash drawer without a sale')}
      >
        <Inbox className="h-3.5 w-3.5" />
        {t('Open drawer')}
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('Open drawer (no sale)')}</DialogTitle>
            <DialogDescription>
              {t('The opening is recorded on shift {number} with your name and the reason.', {
                number: shift.shiftNumber,
              })}
            </DialogDescription>
          </DialogHeader>
          {outcome ? (
            <div className="space-y-3">
              <p
                className={
                  outcome === 'opened'
                    ? 'rounded-md bg-green-50 p-3 text-sm text-green-700'
                    : 'rounded-md bg-amber-50 p-3 text-sm text-amber-800'
                }
              >
                {outcome === 'opened'
                  ? t('Recorded. The drawer is open.')
                  : outcome === 'no_hardware'
                    ? t('Recorded. No hardware connected: open the drawer with its key.')
                    : t('Recorded, but the drawer did not open: open it with its key.')}
              </p>
              {outcome === 'failed' && <ErrorMessage>{error}</ErrorMessage>}
              <div className={cn('flex justify-end', dialogStickyFooter)}>
                <Button onClick={() => reset(false)}>{t('Done')}</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <ErrorMessage>{error}</ErrorMessage>
              <Field label={t('Reason')} htmlFor="no-sale-reason">
                <Input
                  id="no-sale-reason"
                  value={reason}
                  maxLength={500}
                  autoFocus
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('e.g. change for a customer')}
                />
              </Field>
              <div className={cn('flex justify-end gap-2', dialogStickyFooter)}>
                <Button variant="outline" onClick={() => reset(false)} disabled={busy}>
                  {t('Cancel')}
                </Button>
                <Button onClick={submit} disabled={busy || reason.trim().length < 2}>
                  {t('Record and open')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
