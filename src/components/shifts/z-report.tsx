'use client';

import { MOVEMENT_LABELS, movementAmount, ZReport } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

/**
 * Printable shift summary. Printing uses the `.print-receipt` rules in globals.css.
 */
export function ZReportView({
  report,
  storeName,
  copy,
}: {
  report: ZReport;
  storeName?: string;
  // Copy number from the print job (reprints of a Z-report say COPY)
  copy?: number | null;
}) {
  const c = report.shift.currencyCode;
  const money = (value: number | null | undefined) => formatMoney(value ?? 0, c);
  const cash = report.cash;
  const variance = report.variance.variance;

  return (
    <div className="print-receipt space-y-3 font-mono text-xs">
      <div className="text-center">
        {storeName && <div className="text-sm font-bold">{storeName}</div>}
        <div className="font-bold">{report.final ? t('Z-REPORT') : t('X-REPORT (shift still open)')}</div>
        <div>
          {report.shift.shiftNumber} · {report.shift.registerName ?? t('Register')}
        </div>
      </div>
      {copy ? (
        <div className="my-1 border border-black py-0.5 text-center font-bold" data-testid="z-report-copy">
          {copy > 1 ? t('*** COPY #{copy} — NOT AN ORIGINAL ***', { copy }) : t('*** COPY — NOT AN ORIGINAL ***')}
        </div>
      ) : null}

      <Section title={t('Shift')}>
        <Row label={t('Opened')} value={`${formatDateTime(report.shift.openedAt)}`} />
        <Row label={t('Opened by')} value={report.shift.openedBy ?? '—'} />
        {report.shift.businessDate && <Row label={t('Business date')} value={report.shift.businessDate} />}
        {report.shift.closedAt && <Row label={t('Closed')} value={formatDateTime(report.shift.closedAt)} />}
        {report.shift.closedBy && <Row label={t('Closed by')} value={report.shift.closedBy} />}
        {report.shift.approvedBy && <Row label={t('Approved by')} value={report.shift.approvedBy} />}
        {report.shift.forceClosed && <Row label={t('Force-closed')} value={t('Yes')} />}
        {report.shift.blindCount && <Row label={t('Blind count')} value={t('Yes')} />}
      </Section>

      <Section title={t('Sales')}>
        <Row label={t('Sales ({count})', { count: report.sales.count })} value={money(report.sales.total)} />
        {report.sales.voidedCount > 0 && (
          <Row label={t('Voided ({count})', { count: report.sales.voidedCount })} value={money(report.sales.voidedTotal)} />
        )}
        {report.sales.byPaymentMethod.map((m) => (
          <Row key={m.paymentMethodId} label={`${m.name} (${m.count})`} value={money(m.amount)} />
        ))}
      </Section>

      <Section title={t('Cash drawer')}>
        <Row label={t('Opening float')} value={money(cash.openingFloat)} />
        <Row label={t('+ Cash sales')} value={money(cash.cashSales)} />
        <Row label={t('− Change given')} value={money(cash.changeGiven)} />
        <Row label={t('+ Paid in')} value={money(cash.paidIn)} />
        <Row label={t('− Paid out')} value={money(cash.paidOut)} />
        <Row label={t('− Safe drops')} value={money(cash.safeDrops)} />
        <Row label={t('− Expense payouts')} value={money(cash.expensePayouts)} />
        <Row label={t('− Cash refunds')} value={money(cash.cashRefunds)} />
        <Row label={t('Expected in drawer')} value={money(cash.expected)} bold />
        {cash.foreign?.map((f) => (
          <div key={f.currencyCode} className="pt-1">
            {!!f.openingFloat && (
              <Row label={t('Opening float ({currency})', { currency: f.currencyCode })} value={formatMoney(f.openingFloat, f.currencyCode)} />
            )}
            <Row label={t('+ Cash sales ({currency})', { currency: f.currencyCode })} value={formatMoney(f.cashSales, f.currencyCode)} />
            <Row label={t('− Change given ({currency})', { currency: f.currencyCode })} value={formatMoney(f.changeGiven, f.currencyCode)} />
            {!!f.paidIn && (
              <Row label={t('+ Paid in ({currency})', { currency: f.currencyCode })} value={formatMoney(f.paidIn, f.currencyCode)} />
            )}
            {!!f.paidOut && (
              <Row label={t('− Paid out ({currency})', { currency: f.currencyCode })} value={formatMoney(f.paidOut, f.currencyCode)} />
            )}
            {!!f.safeDrops && (
              <Row label={t('− Safe drops ({currency})', { currency: f.currencyCode })} value={formatMoney(f.safeDrops, f.currencyCode)} />
            )}
            {!!f.cashRefunds && (
              <Row label={t('− Cash refunds ({currency})', { currency: f.currencyCode })} value={formatMoney(f.cashRefunds, f.currencyCode)} />
            )}
            {!!f.expensePayouts && (
              <Row
                label={t('− Expense payouts ({currency})', { currency: f.currencyCode })}
                value={formatMoney(f.expensePayouts, f.currencyCode)}
              />
            )}
            <Row label={t('Expected {currency}', { currency: f.currencyCode })} value={formatMoney(f.expected, f.currencyCode)} bold />
          </div>
        ))}
      </Section>

      {report.movements.length > 0 && (
        <Section title={t('Cash movements')}>
          {report.movements.map((m) => (
            <div key={m.id}>
              <Row
                label={`${t(MOVEMENT_LABELS[m.type])} · ${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                value={movementAmount(m, c)}
              />
              {(m.reason || m.user) && (
                <div className="pl-2 text-[10px] text-gray-500">{[m.reason, m.user].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {report.final && (
        <Section title={t('Count')}>
          {report.count.denominations?.map((d) => (
            <Row key={d.value} label={`${money(d.value)} × ${d.quantity}`} value={money(d.value * d.quantity)} />
          ))}
          <Row label={t('Counted')} value={money(report.variance.counted)} bold />
          <Row label={t('Expected')} value={money(report.variance.expected)} />
          <Row
            label={t('Variance')}
            value={`${variance !== null && variance > 0 ? '+' : ''}${money(variance)}`}
            bold
            className={cn(report.variance.overTolerance && 'text-red-600')}
          />
          <Row label={t('Tolerance')} value={`± ${money(report.variance.tolerance)}`} />
          {report.foreignCount?.map((f) => (
            <div key={f.currencyCode} className="pt-1">
              <Row label={t('Counted {currency}', { currency: f.currencyCode })} value={formatMoney(f.counted, f.currencyCode)} bold />
              <Row label={t('Expected {currency}', { currency: f.currencyCode })} value={formatMoney(f.expected, f.currencyCode)} />
              <Row
                label={t('Variance {currency}', { currency: f.currencyCode })}
                value={`${f.variance > 0 ? '+' : ''}${formatMoney(f.variance, f.currencyCode)}`}
                bold
                className={cn(f.variance !== 0 && 'text-red-600')}
              />
            </div>
          ))}
          {report.variance.reason && <div className="pt-1">{t('Reason: {reason}', { reason: report.variance.reason })}</div>}
          {report.notes && <div>{t('Notes: {notes}', { notes: report.notes })}</div>}
        </Section>
      )}

      {report.lateSales && report.lateSales.count > 0 && (
        <Section title={t('Late uploads after close')}>
          <div className="text-[10px]">
            {t('! Uploaded after the shift closed: not included in the figures above.')}
          </div>
          {report.lateSales.byCurrency.map((row) => (
            <Row
              key={row.currencyCode}
              label={t('Sales ({count})', { count: row.count })}
              value={formatMoney(row.total, row.currencyCode)}
            />
          ))}
          <Row label={t('Cash (net of change)')} value={money(report.lateSales.cash)} bold />
          {report.lateSales.foreignCash.map((f) => (
            <Row key={f.currencyCode} label={t('Cash (net of change)')} value={formatMoney(f.amount, f.currencyCode)} bold />
          ))}
          {report.lateSales.sales.map((sale) => (
            <div key={sale.id}>
              <Row label={sale.saleNumber} value={formatMoney(sale.total, sale.currencyCode)} />
              <div className="pl-2 text-[10px] text-gray-500">
                {t('rung up {date}, uploaded {uploaded}', {
                  date: formatDateTime(sale.saleDate),
                  uploaded: formatDateTime(sale.uploadedAt),
                })}
              </div>
            </div>
          ))}
        </Section>
      )}

      {report.corrections && report.corrections.corrections.length > 0 && (
        <Section title={t('Corrections after close')}>
          <div className="text-[10px]">{t('! Recorded after the close by a manager; the figures above stay as closed.')}</div>
          {report.corrections.corrections.map((c) => (
            <div key={c.id}>
              <Row
                label={c.type === 'expected' ? t('Expected cash correction') : t('Counted cash correction')}
                value={`${c.amount > 0 ? '+' : ''}${money(c.amount)}`}
              />
              <div className="pl-2 text-[10px] text-gray-500">
                {[c.reason, c.approvedBy, formatDateTime(c.createdAt)].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
          <Row label={t('Corrected expected')} value={money(report.corrections.expected)} />
          <Row label={t('Corrected counted')} value={money(report.corrections.counted)} />
          <Row
            label={t('Corrected variance')}
            value={`${(report.corrections.variance ?? 0) > 0 ? '+' : ''}${money(report.corrections.variance)}`}
            bold
          />
        </Section>
      )}

      <div className="text-center text-[10px] text-gray-500">{t('Printed {date}', { date: formatDateTime(new Date()) })}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-dashed pt-2">
      <div className="mb-1 font-bold uppercase">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className={cn('flex justify-between gap-2', bold && 'font-bold', className)}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
