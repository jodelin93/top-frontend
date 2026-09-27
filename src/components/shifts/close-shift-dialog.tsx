'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { ClosePreview, ShiftDetail, shiftsApi, ZReport } from '@/lib/api/shifts';
import { posApi } from '@/lib/api/sales';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { CountState, countsFromState, DenominationCountForm, useDenominations } from './denomination-count';
import { ZReportView } from './z-report';
import { t } from '@/i18n';
import { randomId } from '@/lib/uuid';

type Step = 'start' | 'count' | 'review' | 'done';

function newKey() {
  return randomId();
}

/**
 * Close a shift: (blind) count by denomination → review variance → reason and
 * manager approval if above tolerance → Z-report to print.
 * The idempotency key is fixed for the dialog, so a retried close never posts twice.
 */
export function CloseShiftDialog({
  shift,
  open,
  onOpenChange,
  storeName,
  forceClose = false,
}: {
  shift: ShiftDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName?: string;
  // Admin force-close: count straight away, no blind option
  forceClose?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        {open && (
          <CloseShiftBody
            shift={shift}
            storeName={storeName}
            forceClose={forceClose}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CloseShiftBody({
  shift,
  storeName,
  forceClose,
  onDone,
}: {
  shift: ShiftDetail;
  storeName?: string;
  forceClose: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const currency = shift.currencyCode;
  const denominations = useDenominations(currency);
  const { data: settings } = useStoreSettings();
  // Other currencies the drawer may hold: every accepted one, plus any the shift took
  const foreignCurrencies = [
    ...new Set([
      ...Object.keys(settings?.exchangeRates ?? {}),
      ...(shift.cash?.foreign ?? []).map((f) => f.currencyCode),
    ]),
  ].filter((c) => c !== currency);
  const [foreignCounts, setForeignCounts] = useState<Record<string, string>>({});

  const [step, setStep] = useState<Step>(forceClose || shift.status === 'closing' ? 'count' : 'start');
  const [blind, setBlind] = useState(shift.status === 'closing' ? shift.blindCount : !forceClose);
  const [counts, setCounts] = useState<CountState>({});
  const [preview, setPreview] = useState<ClosePreview | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<ZReport | null>(null);
  // Z-report prints are recorded (print_jobs); reprints come out as COPY
  const printer = usePrintDocument();
  // Handover: the next cashier opens the drawer with the counted cash as float
  const [handTo, setHandTo] = useState('');
  const [nextShift, setNextShift] = useState<ShiftDetail['nextShift']>(null);
  const staff = useQuery({
    queryKey: ['pos', 'staff'],
    queryFn: () => posApi.staff(),
    enabled: !forceClose,
    retry: false,
    staleTime: 5 * 60_000,
  });
  const colleagues = (staff.data ?? []).filter((m) => m.id !== shift.openedById);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Fixed while the dialog is open: a retried close returns the first result
  const [idempotencyKey] = useState(newKey);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shifts'] });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(getErrorMessage(err, 'Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const startCount = () =>
    run(async () => {
      if (shift.status === 'open') await shiftsApi.startClose(shift.id, blind);
      await refresh();
      setStep('count');
    });

  const resumeSelling = () =>
    run(async () => {
      await shiftsApi.resume(shift.id);
      await refresh();
      onDone();
    });

  const counted = countsFromState(denominations, counts);
  // Blank = none of that currency in the drawer
  const foreignInput = foreignCurrencies.map((code) => ({
    currencyCode: code,
    countedCash: Number(foreignCounts[code]) || 0,
  }));

  const review = () =>
    run(async () => {
      setPreview(await shiftsApi.previewClose(shift.id, { denominations: counted, foreignCounts: foreignInput }));
      setStep('review');
    });

  const close = () =>
    run(async () => {
      const input = {
        denominations: counted,
        foreignCounts: foreignInput,
        idempotencyKey,
        varianceReason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (handTo) {
        const result = await withApproval((headers) =>
          shiftsApi.handover(shift.id, { ...input, handToUserId: handTo }, headers)
        );
        setNextShift(result.nextShift ?? null);
      } else {
        await withApproval((headers) => shiftsApi.close(shift.id, input, headers));
      }
      setReport(await shiftsApi.zReport(shift.id));
      await refresh();
      setStep('done');
    });

  // A cashier doing a blind count only sees the expected amount after counting
  const showExpected = !blind && shift.cash;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {step === 'done'
            ? t('Shift closed')
            : t(forceClose ? 'Force-close shift {number}' : 'Close shift {number}', { number: shift.shiftNumber })}
        </DialogTitle>
        {step !== 'done' && (
          <DialogDescription>
            {shift.registerName ?? t('Register')} · {t('opened by {name}', { name: shift.openedByName ?? '—' })}
          </DialogDescription>
        )}
      </DialogHeader>

      <ErrorMessage>{error}</ErrorMessage>

      {step === 'start' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('Counting stops selling on this register until the shift is closed or you go back to selling.')}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
            <span>
              <span className="font-medium">{t('Blind count')}</span>
              <span className="block text-gray-500">{t('Count the drawer without seeing the expected amount.')}</span>
            </span>
          </label>
          <div className={cn('flex justify-end gap-2', dialogStickyFooter)}>
            <Button variant="outline" onClick={onDone} disabled={busy}>
              {t('Cancel')}
            </Button>
            <Button onClick={startCount} disabled={busy}>
              {t('Start count')}
            </Button>
          </div>
        </div>
      )}

      {step === 'count' && (
        <div className="space-y-4">
          {showExpected && (
            <p className="rounded-md bg-blue-50 p-2 text-sm text-blue-800">
              {t('Expected in drawer:')} <strong>{formatMoney(shift.cash?.expected, currency)}</strong>
            </p>
          )}
          <DenominationCountForm
            denominations={denominations}
            value={counts}
            onChange={setCounts}
            currency={currency}
          />
          {foreignCurrencies.map((code) => {
            const expected = shift.cash?.foreign?.find((f) => f.currencyCode === code)?.expected ?? 0;
            return (
              <Field
                key={code}
                label={t('{currency} cash in the drawer', { currency: code })}
                htmlFor={`count-${code}`}
                hint={
                  showExpected
                    ? t('Expected: {amount}', { amount: formatMoney(expected, code) })
                    : t('Count the notes and coins in this currency')
                }
              >
                <Input
                  id={`count-${code}`}
                  inputMode="decimal"
                  value={foreignCounts[code] ?? ''}
                  onChange={(e) => setForeignCounts({ ...foreignCounts, [code]: e.target.value })}
                  placeholder="0.00"
                  className="text-right"
                />
              </Field>
            );
          })}
          <div className="flex flex-wrap justify-end gap-2">
            {shift.status === 'closing' && !forceClose && (
              <Button variant="ghost" onClick={resumeSelling} disabled={busy}>
                {t('Back to selling')}
              </Button>
            )}
            <Button onClick={review} disabled={busy}>
              {t('Review count')}
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && preview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label={t('Counted')} value={formatMoney(preview.counted, currency)} />
            <Stat label={t('Expected')} value={formatMoney(preview.expected, currency)} />
            <Stat
              label={t('Variance')}
              value={`${preview.variance > 0 ? '+' : ''}${formatMoney(preview.variance, currency)}`}
              className={cn(
                preview.variance === 0 ? 'text-green-700' : preview.overTolerance ? 'text-red-600' : 'text-amber-700'
              )}
            />
          </div>
          {preview.foreign.map((f) => (
            <div key={f.currencyCode} className="grid grid-cols-3 gap-2 text-center">
              <Stat label={t('Counted {currency}', { currency: f.currencyCode })} value={formatMoney(f.counted, f.currencyCode)} />
              <Stat label={t('Expected {currency}', { currency: f.currencyCode })} value={formatMoney(f.expected, f.currencyCode)} />
              <Stat
                label={t('Variance')}
                value={`${f.variance > 0 ? '+' : ''}${formatMoney(f.variance, f.currencyCode)}`}
                className={cn(f.variance === 0 ? 'text-green-700' : f.overTolerance ? 'text-red-600' : 'text-amber-700')}
              />
            </div>
          ))}
          {preview.requiresReason ? (
            <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {preview.overTolerance
                ? t(
                    preview.variance < 0
                      ? 'The drawer is short by more than the {tolerance} tolerance.'
                      : 'The drawer is over by more than the {tolerance} tolerance.',
                    { tolerance: formatMoney(preview.tolerance, currency) }
                  )
                : t('The {currencies} cash is off by more than the {tolerance} tolerance.', {
                    currencies: preview.foreign
                      .filter((f) => f.overTolerance)
                      .map((f) => f.currencyCode)
                      .join(', '),
                    tolerance: formatMoney(preview.tolerance, currency),
                  })}{' '}
              {preview.requiresApproval ? t('Enter a reason; a manager must approve closing.') : t('Enter a reason.')}
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {t('Within the {tolerance} tolerance.', { tolerance: formatMoney(preview.tolerance, currency) })}
            </p>
          )}
          {preview.requiresReason && (
            <Field label={t('Variance reason')} htmlFor="variance-reason">
              <Input
                id="variance-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('e.g. wrong change given on a large sale')}
              />
            </Field>
          )}
          {!forceClose && colleagues.length > 0 && (
            <Field
              label={t('Hand over to (optional)')}
              htmlFor="hand-over-to"
              hint={t('The next cashier starts a shift on this drawer with the counted cash as opening float.')}
            >
              <Select id="hand-over-to" value={handTo} onChange={(e) => setHandTo(e.target.value)}>
                <option value="">{t('Nobody: just close')}</option>
                {colleagues.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t('Notes (optional)')} htmlFor="close-notes">
            <Textarea
              id="close-notes"
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className={cn('flex justify-end gap-2', dialogStickyFooter)}>
            <Button variant="outline" onClick={() => setStep('count')} disabled={busy}>
              {t('Recount')}
            </Button>
            <Button onClick={close} disabled={busy || (preview.requiresReason && !reason.trim())}>
              {busy ? t('Closing...') : handTo ? t('Close and hand over') : t('Close shift')}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && report && (
        <div className="space-y-4">
          {nextShift && (
            <p className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t('Shift {number} is open for {name} with an opening float of {amount}.', {
                number: nextShift.shiftNumber,
                name: colleagues.find((m) => m.id === nextShift.openedById)?.name ?? '—',
                amount: formatMoney(nextShift.openingFloat, currency),
              })}
              {nextShift.openingForeignCash?.length
                ? ` ${t('Also carried over: {amounts}.', {
                    amounts: nextShift.openingForeignCash
                      .map((f) => formatMoney(f.amount, f.currencyCode))
                      .join(', '),
                  })}`
                : null}
            </p>
          )}
          <div className="max-h-[55vh] overflow-y-auto rounded-md border p-4">
            <ZReportView report={report} storeName={storeName} copy={printer.copy} />
          </div>
          <ErrorMessage>{printer.error}</ErrorMessage>
          <div className={cn('grid grid-cols-2 gap-2', dialogStickyFooter)}>
            <Button variant="outline" onClick={() => printer.print('z_report', shift.id)}>
              <Printer className="h-4 w-4" />
              {t('Print Z-report')}
            </Button>
            <Button onClick={onDone}>{t('Done')}</Button>
          </div>
        </div>
      )}
      {approvalDialog}
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={cn('font-semibold tabular-nums', className)}>{value}</div>
    </div>
  );
}
