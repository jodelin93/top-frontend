'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { today } from '@/components/admin/purchasing-invoices';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { payablesApi, SupplierAging } from '@/lib/api/purchasing';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';
import { translateServerNote } from '@/lib/server-texts';
import { paymentMethodLabels } from './purchasing-payments';

const BUCKETS: { key: keyof SupplierAging; label: string }[] = [
  { key: 'current', label: 'Not yet due' },
  { key: 'days1to30', label: '1–30 days' },
  { key: 'days31to60', label: '31–60 days' },
  { key: 'days61to90', label: '61–90 days' },
  { key: 'over90', label: 'Over 90 days' },
];

const sum = (rows: SupplierAging[], key: keyof SupplierAging) =>
  Math.round(rows.reduce((total, r) => total + Number(r[key] ?? 0), 0) * 100) / 100;

/**
 * What is owed to each supplier, by how overdue it is. Always derived from
 * invoices, payments and credits (never edited directly).
 */
export function PayablesTab() {
  const currency = useCurrency();
  const [asOf, setAsOf] = useState(today());
  const [statementOf, setStatementOf] = useState<SupplierAging | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ['payables', 'aging', asOf],
    queryFn: () => payablesApi.aging(asOf || undefined),
  });
  const rows = data?.suppliers ?? [];

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-end">
        <Field label={t('Aging as of')} htmlFor="aging-as-of">
          <Input id="aging-as-of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
        <p className="flex-1 text-sm text-gray-500 sm:pb-2">
          {t('Open invoice amounts by days past their due date. Click a supplier for its statement.')}
        </p>
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load the payables')}</ErrorMessage>
        </div>
      )}
      <Table>
        <THead>
          <tr>
            <Th>{t('Supplier')}</Th>
            {BUCKETS.map((b) => (
              <Th key={b.key} className="text-right">
                {t(b.label)}
              </Th>
            ))}
            <Th className="text-right">{t('Unapplied')}</Th>
            <Th className="text-right">{t('Balance')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
          ) : rows.length === 0 ? (
            <EmptyRow colSpan={8}>{t('Nothing is owed to suppliers.')}</EmptyRow>
          ) : (
            <>
              {rows.map((row) => {
                const code = row.currencyCode ?? currency;
                return (
                  <tr key={row.supplierId} className="cursor-pointer hover:bg-gray-50" onClick={() => setStatementOf(row)}>
                    <Td>
                      <div className="font-medium">{row.supplierName}</div>
                      <div className="font-mono text-xs text-gray-500">{row.supplierCode}</div>
                    </Td>
                    {BUCKETS.map((b) => (
                      <Td
                        key={b.key}
                        className={`text-right ${
                          b.key !== 'current' && Number(row[b.key]) > 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {Number(row[b.key]) ? formatMoney(Number(row[b.key]), code) : '—'}
                      </Td>
                    ))}
                    <Td className="text-right text-gray-600">
                      {row.unapplied ? `−${formatMoney(row.unapplied, code)}` : '—'}
                    </Td>
                    <Td className="text-right font-semibold">{formatMoney(row.balance, code)}</Td>
                  </tr>
                );
              })}
              {rows.every((r) => (r.currencyCode ?? currency) === currency) && (
                <tr className="border-t-2 font-semibold">
                  <Td>{t('Total')}</Td>
                  {BUCKETS.map((b) => (
                    <Td key={b.key} className="text-right">
                      {formatMoney(sum(rows, b.key), currency)}
                    </Td>
                  ))}
                  <Td className="text-right">−{formatMoney(sum(rows, 'unapplied'), currency)}</Td>
                  <Td className="text-right">{formatMoney(sum(rows, 'balance'), currency)}</Td>
                </tr>
              )}
            </>
          )}
        </TBody>
      </Table>
      {statementOf && (
        <StatementDialog
          supplierId={statementOf.supplierId}
          to={asOf || today()}
          onClose={() => setStatementOf(null)}
        />
      )}
    </Card>
  );
}

const typeLabels = { invoice: 'Invoice', credit: 'Credit', payment: 'Payment' } as const;

function StatementDialog({ supplierId, to: initialTo, onClose }: { supplierId: string; to: string; onClose: () => void }) {
  const storeCurrency = useCurrency();
  const [from, setFrom] = useState(`${initialTo.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(initialTo);
  const { data, isLoading, error } = useQuery({
    queryKey: ['payables', 'statement', supplierId, from, to],
    queryFn: () => payablesApi.statement(supplierId, { from, to }),
    enabled: !!from && !!to && from <= to,
  });
  const currency = data?.supplier.currencyCode ?? storeCurrency;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Statement: {name}', { name: data?.supplier.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('Invoices, credits and payments with the running balance.')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:w-96">
          <Field label={t('From')} htmlFor="statement-from">
            <Input id="statement-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('To')} htmlFor="statement-to">
            <Input id="statement-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <ErrorMessage>{error ? getErrorMessage(error, 'Could not load the statement') : null}</ErrorMessage>
        <div id="supplier-statement" className="max-h-[50vh] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t('Date')}</th>
                <th className="px-3 py-2 font-medium">{t('Document')}</th>
                <th className="px-3 py-2 font-medium">{t('Description')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('Billed')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('Paid / credited')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('Balance')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading || !data ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : (
                <>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-2" colSpan={5}>
                      {t('Opening balance on {date}', { date: formatDate(data.from) })}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatMoney(data.openingBalance, currency)}</td>
                  </tr>
                  {data.lines.map((line) => (
                    <tr key={`${line.type}-${line.id}`}>
                      <td className="whitespace-nowrap px-3 py-2">{formatDate(line.date)}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-500">{t(typeLabels[line.type])}</span>{' '}
                        <span className="font-mono text-xs">{line.number}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {statementDescription(line.type, line.description)}
                      </td>
                      <td className="px-3 py-2 text-right">{line.debit ? formatMoney(line.debit, currency) : ''}</td>
                      <td className="px-3 py-2 text-right">{line.credit ? formatMoney(line.credit, currency) : ''}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(line.balance, currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2" colSpan={5}>
                      {t('Closing balance on {date}', { date: formatDate(data.to) })}
                    </td>
                    <td className="px-3 py-2 text-right">{formatMoney(data.closingBalance, currency)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {data?.aging && (
          <p className="text-xs text-gray-500">
            {BUCKETS.map((b) => `${t(b.label)}: ${formatMoney(Number(data.aging![b.key]), currency)}`).join(' · ')}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            {t('Print')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Description written by the server: "Invoice due 2026-01-31", or "bank_transfer · ref"
function statementDescription(type: string, description: string | null | undefined): string {
  if (!description) return '';
  if (type === 'payment') {
    const [method, ...rest] = description.split(' · ');
    const label = paymentMethodLabels[method as keyof typeof paymentMethodLabels];
    return label ? [t(label), ...rest].join(' · ') : description;
  }
  return translateServerNote(description);
}
