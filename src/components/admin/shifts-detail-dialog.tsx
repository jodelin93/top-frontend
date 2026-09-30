'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, Lock, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage } from '@/components/admin/page-header';
import { CloseShiftDialog } from '@/components/shifts/close-shift-dialog';
import { ZReportView } from '@/components/shifts/z-report';
import { ShiftLedgerPanel } from '@/components/admin/shifts-ledger';
import { ShiftCorrectionsPanel } from '@/components/admin/shifts-corrections';
import { getErrorMessage } from '@/lib/api/client';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { isCashIn, LateSales, MOVEMENT_LABELS, movementAmount, ShiftDetail, shiftsApi } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { hasPermission, useAuthStore } from '@/stores/auth-store';

export const shiftStatusVariant = (status: string) =>
  status === 'open' ? 'info' : status === 'closing' ? 'warning' : 'default';

/**
 * Shift detail for the back office: totals, cash movements, Z-report reprint and force-close
 */
export function ShiftDetailDialog({
  shiftId,
  onClose,
  storeName,
}: {
  shiftId: string | null;
  onClose: () => void;
  storeName?: string;
}) {
  return (
    <Dialog open={!!shiftId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        {shiftId && <ShiftDetailBody key={shiftId} shiftId={shiftId} storeName={storeName} />}
      </DialogContent>
    </Dialog>
  );
}

function ShiftDetailBody({ shiftId, storeName }: { shiftId: string; storeName?: string }) {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, 'shifts.manage');
  const [showReport, setShowReport] = useState(false);
  // Z-report prints are recorded (print_jobs); reprints come out as COPY
  const printer = usePrintDocument();
  const [showLedger, setShowLedger] = useState(false);
  const [closing, setClosing] = useState(false);

  const {
    data: shift,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['shifts', 'detail', shiftId],
    queryFn: () => shiftsApi.get(shiftId),
  });
  const report = useQuery({
    queryKey: ['shifts', 'z-report', shiftId],
    queryFn: () => shiftsApi.zReport(shiftId),
    enabled: showReport,
  });

  if (isLoading) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;
  if (error || !shift) return <ErrorMessage>{getErrorMessage(error, 'Could not load the shift')}</ErrorMessage>;

  const c = shift.currencyCode;
  // A shared drawer's shift belongs to every cashier on it
  const ownShift = shift.openedById === user?.id || !!shift.shared;
  const canClose = shift.status !== 'closed' && (canManage || ownShift);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {t('Shift {number}', { number: shift.shiftNumber })}
          <Badge variant={shiftStatusVariant(shift.status)}>{t(shift.status)}</Badge>
          {shift.forceClosed && <Badge variant="warning">{t('force-closed')}</Badge>}
          {shift.shared && <Badge variant="info">{t('shared drawer')}</Badge>}
        </DialogTitle>
        <DialogDescription>
          {shift.registerName ?? t('Register')}
          {shift.drawerName ? ` · ${shift.drawerName}` : ''}
          {shift.businessDate ? ` · ${t('business date {date}', { date: shift.businessDate })}` : ''} ·{' '}
          {t('opened {date} by {name}', { date: formatDateTime(shift.openedAt), name: shift.openedByName ?? '—' })}
          {shift.closedAt &&
            ` · ${t('closed {date} by {name}', {
              date: formatDateTime(shift.closedAt),
              name: shift.closedByName ?? '—',
            })}`}
        </DialogDescription>
      </DialogHeader>

      {showReport ? (
        <div className="space-y-3">
          {report.error && <ErrorMessage>{getErrorMessage(report.error, 'Could not load the report')}</ErrorMessage>}
          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-4">
            {report.data ? (
              <ZReportView report={report.data} storeName={storeName} copy={report.data.final ? printer.copy : null} />
            ) : (
              t('Loading...')
            )}
          </div>
          <ErrorMessage>{printer.error}</ErrorMessage>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReport(false)}>
              {t('Back')}
            </Button>
            <Button
              // A Z-report (closed shift) is a recorded document; an X-report is a plain printout
              onClick={() => (report.data?.final ? printer.print('z_report', shift.id) : window.print())}
              disabled={!report.data}
            >
              <Printer className="h-4 w-4" />
              {t('Print')}
            </Button>
          </div>
        </div>
      ) : showLedger ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold">{t('Drawer ledger')}</div>
          <ShiftLedgerPanel shiftId={shift.id} />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLedger(false)}>
              {t('Back')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ShiftSummaryView shift={shift} currency={c} />
          {shift.status === 'closed' && (
            <ShiftCorrectionsPanel
              shiftId={shift.id}
              currency={c}
              corrections={shift.corrections}
              canManage={canManage}
            />
          )}
        </>
      )}

      {!showReport && !showLedger && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setShowLedger(true)}>
            <BookOpen className="h-4 w-4" />
            {t('Drawer ledger')}
          </Button>
          <Button variant="outline" onClick={() => setShowReport(true)}>
            <Printer className="h-4 w-4" />
            {shift.status === 'closed' ? t('Z-report') : t('X-report')}
          </Button>
          {canClose && (
            <Button
              variant={ownShift ? 'default' : 'destructive'}
              onClick={() => setClosing(true)}
            >
              <Lock className="h-4 w-4" />
              {ownShift ? t('Close shift') : t('Force-close')}
            </Button>
          )}
        </div>
      )}

      {closing && (
        <CloseShiftDialog
          shift={shift}
          open={closing}
          onOpenChange={setClosing}
          storeName={storeName}
          forceClose={!ownShift}
        />
      )}
    </>
  );
}

function ShiftSummaryView({ shift, currency }: { shift: ShiftDetail; currency: string }) {
  const money = (v: number | null | undefined) => formatMoney(v, currency);
  const smallScreen = useSmallScreen();
  const variance = shift.variance;
  // Per-sale rows live in the drawer ledger
  const movements = shift.movements.filter((m) => m.type !== 'sale');
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={t('Opening float')} value={money(shift.openingFloat)} />
        <Stat label={t('Expected')} value={shift.cash ? money(shift.cash.expected) : money(shift.expectedCash)} />
        <Stat label={t('Counted')} value={shift.countedCash === null ? '—' : money(shift.countedCash)} />
        <Stat
          label={t('Variance')}
          value={variance === null ? '—' : `${variance > 0 ? '+' : ''}${money(variance)}`}
          className={cn(
            variance !== null && variance !== 0 && (shift.overTolerance ? 'text-red-600' : 'text-amber-700')
          )}
        />
      </div>
      {shift.varianceReason && (
        <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800">{t('Variance reason: {reason}', { reason: shift.varianceReason })}</p>
      )}

      {shift.lateSales && shift.lateSales.count > 0 && <LateSalesPanel late={shift.lateSales} currency={currency} />}

      {shift.cash && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <div className="mb-1 font-semibold">{t('Cash drawer')}</div>
            <Line label={t('Opening float')} value={money(shift.cash.openingFloat)} />
            <Line label={t('Cash sales')} value={money(shift.cash.cashSales)} />
            <Line label={t('Change given')} value={`−${money(shift.cash.changeGiven)}`} />
            <Line label={t('Paid in')} value={money(shift.cash.paidIn)} />
            <Line label={t('Paid out')} value={`−${money(shift.cash.paidOut)}`} />
            <Line label={t('Safe drops')} value={`−${money(shift.cash.safeDrops)}`} />
            <Line label={t('Expense payouts')} value={`−${money(shift.cash.expensePayouts)}`} />
            <Line label={t('Cash refunds')} value={`−${money(shift.cash.cashRefunds)}`} />
            <Line label={t('Expected')} value={money(shift.cash.expected)} bold />
            {shift.cash.foreign?.map((f) => {
              const count = shift.foreignCash?.find((c) => c.currencyCode === f.currencyCode);
              return (
                <div key={f.currencyCode} className="mt-2 border-t pt-2">
                  {!!f.openingFloat && (
                    <Line label={t('Opening float ({currency})', { currency: f.currencyCode })} value={formatMoney(f.openingFloat, f.currencyCode)} />
                  )}
                  <Line label={t('Cash sales ({currency})', { currency: f.currencyCode })} value={formatMoney(f.cashSales, f.currencyCode)} />
                  <Line label={t('Change given ({currency})', { currency: f.currencyCode })} value={`−${formatMoney(f.changeGiven, f.currencyCode)}`} />
                  {!!f.paidIn && (
                    <Line label={t('Paid in ({currency})', { currency: f.currencyCode })} value={formatMoney(f.paidIn, f.currencyCode)} />
                  )}
                  {!!f.paidOut && (
                    <Line label={t('Paid out ({currency})', { currency: f.currencyCode })} value={`−${formatMoney(f.paidOut, f.currencyCode)}`} />
                  )}
                  {!!f.safeDrops && (
                    <Line label={t('Safe drops ({currency})', { currency: f.currencyCode })} value={`−${formatMoney(f.safeDrops, f.currencyCode)}`} />
                  )}
                  {!!f.cashRefunds && (
                    <Line label={t('Cash refunds ({currency})', { currency: f.currencyCode })} value={`−${formatMoney(f.cashRefunds, f.currencyCode)}`} />
                  )}
                  {!!f.expensePayouts && (
                    <Line
                      label={t('Expense payouts ({currency})', { currency: f.currencyCode })}
                      value={`−${formatMoney(f.expensePayouts, f.currencyCode)}`}
                    />
                  )}
                  <Line label={t('Expected {currency}', { currency: f.currencyCode })} value={formatMoney(f.expected, f.currencyCode)} bold />
                  {count && (
                    <>
                      <Line label={t('Counted {currency}', { currency: f.currencyCode })} value={formatMoney(count.counted, f.currencyCode)} />
                      <Line
                        label={t('Variance {currency}', { currency: f.currencyCode })}
                        value={`${count.variance > 0 ? '+' : ''}${formatMoney(count.variance, f.currencyCode)}`}
                        bold
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {shift.sales && (
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="mb-1 font-semibold">{t('Sales')}</div>
              <Line label={t('Sales ({count})', { count: shift.sales.count })} value={money(shift.sales.total)} />
              {shift.sales.voidedCount > 0 && (
                <Line label={t('Voided ({count})', { count: shift.sales.voidedCount })} value={money(shift.sales.voidedTotal)} />
              )}
              {shift.sales.byPaymentMethod.map((m) => (
                <Line key={m.paymentMethodId} label={`${m.name} (${m.count})`} value={money(m.amount)} />
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="mb-1 text-sm font-semibold">{t('Cash movements')}</div>
        {smallScreen ? (
          // Phones: one card per movement
          <DataCards
            items={movements}
            getKey={(m) => m.id}
            emptyText={t('No cash movements.')}
            className="p-0"
          >
            {(m) => (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{t(MOVEMENT_LABELS[m.type])}</div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(m.createdAt)} · {m.userName ?? '—'}
                    </div>
                  </div>
                  <span
                    className={cn('shrink-0 tabular-nums', isCashIn(m.type) ? 'text-green-700' : 'text-gray-900')}
                  >
                    {movementAmount(m, currency)}
                  </span>
                </div>
                {m.reason && (
                  <DataCardFields>
                    <DataCardField label={t('Reason')} full>
                      {m.reason}
                    </DataCardField>
                  </DataCardFields>
                )}
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Time')}</Th>
              <Th>{t('Type')}</Th>
              <Th>{t('Reason')}</Th>
              <Th>{t('By')}</Th>
              <Th className="text-right">{t('Amount')}</Th>
            </tr>
          </THead>
          <TBody>
            {movements.length === 0 ? (
              <EmptyRow colSpan={5}>{t('No cash movements.')}</EmptyRow>
            ) : (
              movements.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(m.createdAt)}</Td>
                  <Td>{t(MOVEMENT_LABELS[m.type])}</Td>
                  <Td className="max-w-xs truncate">{m.reason ?? '—'}</Td>
                  <Td>{m.userName ?? '—'}</Td>
                  <Td className={cn('text-right tabular-nums', isCashIn(m.type) ? 'text-green-700' : 'text-gray-900')}>
                    {movementAmount(m, currency)}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        )}
      </div>
    </div>
  );
}

/** Sales uploaded after the shift closed: shown next to the frozen figures, never folded in */
function LateSalesPanel({ late, currency }: { late: LateSales; currency: string }) {
  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {t('Late uploads after close')}
      </div>
      <p className="text-xs">
        {t(
          'These sales were uploaded after the shift closed (e.g. offline sales). They are not in the figures above, which were frozen at close. Check the drawer and record any adjustment separately.'
        )}
      </p>
      <div className="space-y-0.5">
        {late.byCurrency.map((row) => (
          <Line
            key={row.currencyCode}
            label={t('Sales ({count})', { count: row.count })}
            value={formatMoney(row.total, row.currencyCode)}
          />
        ))}
        <Line label={t('Cash (net of change)')} value={formatMoney(late.cash, currency)} />
        {late.foreignCash.map((f) => (
          <Line key={f.currencyCode} label={t('Cash (net of change)')} value={formatMoney(f.amount, f.currencyCode)} />
        ))}
      </div>
      <ul className="divide-y divide-amber-200 text-xs">
        {late.sales.map((sale) => (
          <li key={sale.id} className="flex justify-between gap-2 py-1">
            <span>
              <span className="font-mono">{sale.saleNumber}</span>{' '}
              {t('rung up {date}, uploaded {uploaded}', {
                date: formatDateTime(sale.saleDate),
                uploaded: formatDateTime(sale.uploadedAt),
              })}
            </span>
            <span className="tabular-nums">{formatMoney(sale.total, sale.currencyCode)}</span>
          </li>
        ))}
      </ul>
      {late.count > late.sales.length && (
        <p className="text-xs">{t('and {count} more', { count: late.count - late.sales.length })}</p>
      )}
    </div>
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

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex justify-between', bold && 'border-t pt-1 font-semibold')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
