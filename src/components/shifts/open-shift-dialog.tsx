'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { countTotal, shiftsApi } from '@/lib/api/shifts';
import { formatMoney } from '@/lib/format';
import { CountState, countsFromState, DenominationCountForm, useDenominations } from './denomination-count';
import { t } from '@/i18n';

/**
 * Open a shift with its opening float, typed as an amount or counted by denomination
 */
export function OpenShiftDialog({
  registerId,
  registerName,
  currency,
  open,
  onOpenChange,
}: {
  registerId: string;
  registerName?: string;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open && (
          <OpenShiftForm
            registerId={registerId}
            registerName={registerName}
            currency={currency}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OpenShiftForm({
  registerId,
  registerName,
  currency,
  onDone,
}: {
  registerId: string;
  registerName?: string;
  currency: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const denominations = useDenominations(currency);
  const [mode, setMode] = useState<'count' | 'amount'>('count');
  const [counts, setCounts] = useState<CountState>({});
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const counted = countsFromState(denominations, counts);
  const float = mode === 'count' ? countTotal(counted) : Number(amount) || 0;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await shiftsApi.open({
        registerId,
        ...(mode === 'count' ? { denominations: counted } : { openingFloat: Math.round(float * 100) / 100 }),
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not open the shift'));
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Open shift')}</DialogTitle>
        <DialogDescription>
          {registerName
            ? t('{register}: count the cash in the drawer before the first sale.', { register: registerName })
            : t('Count the cash in the drawer before the first sale.')}
        </DialogDescription>
      </DialogHeader>
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex gap-1 rounded-md bg-gray-100 p-1 text-sm">
        {(['count', 'amount'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded px-3 py-1 ${mode === m ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
          >
            {m === 'count' ? t('Count by denomination') : t('Enter total')}
          </button>
        ))}
      </div>
      {mode === 'count' ? (
        <DenominationCountForm denominations={denominations} value={counts} onChange={setCounts} currency={currency} />
      ) : (
        <Field label={t('Opening float')} htmlFor="opening-float">
          <Input
            id="opening-float"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </Field>
      )}
      <Field label={t('Notes (optional)')} htmlFor="open-notes">
        <Input id="open-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">
          {t('Float:')} <strong>{formatMoney(float, currency)}</strong>
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone} disabled={busy}>
            {t('Cancel')}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? t('Opening...') : t('Open shift')}
          </Button>
        </div>
      </div>
    </>
  );
}
