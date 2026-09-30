'use client';

import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Lock, Vault, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ManualMovementType, MOVEMENT_LABELS, movementAmount, ShiftDetail, shiftsApi } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { CashMovementDialog } from './cash-movement-dialog';
import { CloseShiftDialog } from './close-shift-dialog';
import { OpenShiftDialog } from './open-shift-dialog';
import { t } from '@/i18n';

/**
 * Till header widget: shift status for the register, open with a float,
 * paid-in/out, safe drops and closing with a count. Renders a quiet chip
 * (never blocks the till) when the API can't be reached.
 */
export function ShiftPanel({
  registerId,
  registerName,
  currency = 'USD',
  storeName,
}: {
  registerId: string | null | undefined;
  registerName?: string;
  currency?: string;
  storeName?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const canOperate = hasPermission(user, 'shifts.operate');
  const [panelOpen, setPanelOpen] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [movement, setMovement] = useState<ManualMovementType | null>(null);
  // Kept while the close dialog is up: once closed, the register has no current shift
  const [closing, setClosing] = useState<ShiftDetail | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shifts', 'current', registerId],
    queryFn: () => shiftsApi.current(registerId!),
    enabled: !!registerId && canOperate,
    retry: false,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!registerId || !canOperate) return null;

  const shift = data?.shift ?? null;
  const closeTarget = shift ?? closing;
  const money = (value: number | null | undefined) => formatMoney(value, shift?.currencyCode ?? currency);

  let chip: ReactNode;
  if (isError) {
    chip = (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500" title={t('Shift status unavailable')}>
        <Wallet className="mr-1 inline h-3.5 w-3.5" />
        {t('Shift: unavailable')}
      </span>
    );
  } else if (isLoading || !data) {
    chip = <span className="rounded-full bg-gray-50 px-3 py-1 text-xs text-gray-400">{t('Shift…')}</span>;
  } else if (shift) {
    chip = (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className={cn(
          'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
          shift.status === 'open' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-800'
        )}
        title={t('Shift and cash drawer')}
      >
        <Wallet className="h-3.5 w-3.5" />
        {shift.shiftNumber} · {shift.status === 'open' ? t('Open') : t('Counting')}
      </button>
    );
  } else {
    chip = (
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setOpenDialog(true)}>
        <Wallet className="h-3.5 w-3.5" />
        {t('Open shift')}
      </Button>
    );
  }

  return (
    <>
      {chip}

      {shift && (
        <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('Shift {number}', { number: shift.shiftNumber })}</DialogTitle>
              <DialogDescription>
                {shift.registerName ?? registerName} ·{' '}
                {t('opened {date} by {name}', { date: formatDateTime(shift.openedAt), name: shift.openedByName ?? '—' })}
              </DialogDescription>
            </DialogHeader>

            {shift.cash ? (
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <Line label={t('Opening float')} value={money(shift.cash.openingFloat)} />
                <Line label={t('Cash sales (net of change)')} value={money(shift.cash.cashSales - shift.cash.changeGiven)} />
                <Line label={t('Paid in')} value={money(shift.cash.paidIn)} />
                <Line label={t('Paid out')} value={`−${money(shift.cash.paidOut)}`} />
                <Line label={t('Safe drops')} value={`−${money(shift.cash.safeDrops)}`} />
                <Line label={t('Expense payouts')} value={`−${money(shift.cash.expensePayouts)}`} />
                {shift.cash.cashRefunds > 0 && (
                  <Line label={t('Cash refunds')} value={`−${money(shift.cash.cashRefunds)}`} />
                )}
                <Line label={t('Expected in drawer')} value={money(shift.cash.expected)} bold />
                {/* Other currencies in the drawer (e.g. HTG): counted separately at close */}
                {shift.cash.foreign?.map((f) => {
                  const fm = (v: number) => formatMoney(v, f.currencyCode);
                  return (
                    <div key={f.currencyCode} className="mt-2 space-y-1 border-t pt-2">
                      {!!f.openingFloat && (
                        <Line label={t('Opening float ({currency})', { currency: f.currencyCode })} value={fm(f.openingFloat)} />
                      )}
                      {!!(f.cashSales || f.changeGiven) && (
                        <Line
                          label={t('Cash sales ({currency})', { currency: f.currencyCode })}
                          value={fm(f.cashSales - f.changeGiven)}
                        />
                      )}
                      {!!f.paidIn && <Line label={t('Paid in ({currency})', { currency: f.currencyCode })} value={fm(f.paidIn)} />}
                      {!!f.paidOut && (
                        <Line label={t('Paid out ({currency})', { currency: f.currencyCode })} value={`−${fm(f.paidOut)}`} />
                      )}
                      {!!f.safeDrops && (
                        <Line label={t('Safe drops ({currency})', { currency: f.currencyCode })} value={`−${fm(f.safeDrops)}`} />
                      )}
                      {!!f.cashRefunds && (
                        <Line label={t('Cash refunds ({currency})', { currency: f.currencyCode })} value={`−${fm(f.cashRefunds)}`} />
                      )}
                      {!!f.expensePayouts && (
                        <Line
                          label={t('Expense payouts ({currency})', { currency: f.currencyCode })}
                          value={`−${fm(f.expensePayouts)}`}
                        />
                      )}
                      <Line label={t('Expected {currency}', { currency: f.currencyCode })} value={fm(f.expected)} bold />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                {t('Blind count in progress: the expected amount is shown after you count.')}
              </p>
            )}

            {shift.movements.length > 1 && (
              <div className="max-h-40 space-y-1 overflow-y-auto text-xs text-gray-600">
                {shift.movements
                  .filter((m) => m.type !== 'opening_float' && m.type !== 'sale')
                  .map((m) => (
                    <div key={m.id} className="flex justify-between gap-2">
                      <span className="truncate">
                        {t(MOVEMENT_LABELS[m.type])}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </span>
                      <span className="tabular-nums">
                        {movementAmount(m, shift.currencyCode ?? currency)}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {shift.status === 'open' && (
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => setMovement('paid_in')}>
                  <ArrowDownToLine className="h-4 w-4" />
                  {t('Paid in')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMovement('paid_out')}>
                  <ArrowUpFromLine className="h-4 w-4" />
                  {t('Paid out')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMovement('safe_drop')}>
                  <Vault className="h-4 w-4" />
                  {t('Safe drop')}
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                setPanelOpen(false);
                setClosing(shift);
                setCloseDialog(true);
              }}
            >
              <Lock className="h-4 w-4" />
              {shift.status === 'closing' ? t('Continue closing') : t('Close shift')}
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {shift && (
        <CashMovementDialog
          shiftId={shift.id}
          currency={shift.currencyCode ?? currency}
          type={movement}
          onClose={() => setMovement(null)}
        />
      )}
      {closeTarget && (
        <CloseShiftDialog
          shift={closeTarget}
          open={closeDialog}
          onOpenChange={(open) => {
            setCloseDialog(open);
            if (!open) setClosing(null);
          }}
          storeName={storeName}
        />
      )}
      <OpenShiftDialog
        registerId={registerId}
        registerName={registerName}
        currency={currency}
        open={openDialog}
        onOpenChange={setOpenDialog}
      />
    </>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex justify-between', bold && 'border-t pt-1 font-semibold')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
