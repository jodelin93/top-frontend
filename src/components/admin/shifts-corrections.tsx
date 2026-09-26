'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { ShiftCorrections, ShiftCorrectionType, shiftsApi } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Corrections of a closed shift: listed next to the frozen figures, and (managers)
 * a form to add one. The shift is never reopened.
 */
export function ShiftCorrectionsPanel({
  shiftId,
  currency,
  corrections,
  canManage,
}: {
  shiftId: string;
  currency: string;
  corrections: ShiftCorrections | null | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<ShiftCorrectionType>('expected');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const money = (value: number | null | undefined) => formatMoney(value, currency);

  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value !== 0 && reason.trim().length >= 2;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await withApproval((headers) =>
        shiftsApi.addCorrection(shiftId, { type, amount: value, reason: reason.trim() }, headers)
      );
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setAdding(false);
      setAmount('');
      setReason('');
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the correction'));
    } finally {
      setBusy(false);
    }
  };

  const list = corrections?.corrections ?? [];
  if (list.length === 0 && !canManage) return null;

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t('Corrections after close')}</div>
        {canManage && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            {t('Add correction')}
          </Button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-gray-500">{t('No corrections. A closed shift is corrected here instead of being reopened.')}</p>
      ) : (
        <>
          <ul className="divide-y text-xs">
            {list.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 py-1">
                <span>
                  <span className="font-medium">
                    {c.type === 'expected' ? t('Expected cash correction') : t('Counted cash correction')}
                  </span>{' '}
                  · {c.reason} · {c.approvedBy ?? '—'} · {formatDateTime(c.createdAt)}
                </span>
                <span className="tabular-nums">
                  {c.amount > 0 ? '+' : ''}
                  {money(c.amount)}
                </span>
              </li>
            ))}
          </ul>
          {corrections && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Figure label={t('Corrected expected')} value={money(corrections.expected)} />
              <Figure label={t('Corrected counted')} value={money(corrections.counted)} />
              <Figure
                label={t('Corrected variance')}
                value={`${(corrections.variance ?? 0) > 0 ? '+' : ''}${money(corrections.variance)}`}
                className={cn(corrections.variance !== null && corrections.variance !== 0 && 'text-amber-700')}
              />
            </div>
          )}
        </>
      )}

      {adding && (
        <div className="space-y-2 border-t pt-2">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t('What is corrected')} htmlFor="correction-type">
              <Select
                id="correction-type"
                value={type}
                onChange={(e) => setType(e.target.value as ShiftCorrectionType)}
              >
                <option value="expected">{t('Expected cash (e.g. an unrecorded paid-out)')}</option>
                <option value="counted">{t('Counted cash (recount)')}</option>
              </Select>
            </Field>
            <Field
              label={t('Amount')}
              htmlFor="correction-amount"
              hint={t('Negative to lower the figure, positive to raise it')}
            >
              <Input
                id="correction-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="-5.00"
                className="text-right"
              />
            </Field>
          </div>
          <Field label={t('Reason')} htmlFor="correction-reason">
            <Input
              id="correction-reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdding(false)} disabled={busy}>
              {t('Cancel')}
            </Button>
            <Button onClick={save} disabled={busy || !valid}>
              {t('Save correction')}
            </Button>
          </div>
        </div>
      )}
      {approvalDialog}
    </div>
  );
}

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={cn('font-semibold tabular-nums', className)}>{value}</div>
    </div>
  );
}
