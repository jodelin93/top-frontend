'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { ManualMovementType, MOVEMENT_LABELS, shiftsApi } from '@/lib/api/shifts';
import { t } from '@/i18n';

const HINTS: Record<ManualMovementType, string> = {
  paid_in: 'Cash put into the drawer, e.g. extra change from the safe.',
  paid_out: 'Cash taken out for a small payment, e.g. a delivery tip.',
  safe_drop: 'Cash moved from the drawer to the safe to keep the float low.',
};

/**
 * Paid-in, paid-out or safe drop. Needs shifts.manage, or a manager's approval.
 */
export function CashMovementDialog({
  shiftId,
  type,
  onClose,
}: {
  shiftId: string;
  type: ManualMovementType | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {type && <MovementForm key={type} shiftId={shiftId} type={type} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function MovementForm({ shiftId, type, onClose }: { shiftId: string; type: ManualMovementType; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Same key for retries of this entry, so it is never recorded twice
  const [key] = useState(() => `mv-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const value = Number(amount);
  const valid = value > 0 && reason.trim().length >= 2;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await withApproval((headers) =>
        shiftsApi.addMovement(
          shiftId,
          {
            type,
            amount: Math.round(value * 100) / 100,
            reason: reason.trim(),
            reference: reference.trim() || undefined,
            idempotencyKey: key,
          },
          headers
        )
      );
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the cash movement'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t(MOVEMENT_LABELS[type])}</DialogTitle>
        <DialogDescription>{t(HINTS[type])}</DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={t('Amount')} htmlFor="movement-amount">
          <Input
            id="movement-amount"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>
        <Field label={t('Reason')} htmlFor="movement-reason">
          <Input id="movement-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field
          label={t('Reference (optional)')}
          htmlFor="movement-reference"
          hint={t('Bag number, receipt number...')}
        >
          <Input
            id="movement-reference"
            maxLength={255}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </Field>
        <div className={cn('flex justify-end gap-2', dialogStickyFooter)}>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button type="submit" disabled={busy || !valid}>
            {busy ? t('Saving...') : t('Record')}
          </Button>
        </div>
      </form>
      {approvalDialog}
    </>
  );
}
