'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { DataCardField, DataCardFields, DataCardHeader, DataCards, useSmallScreen } from '@/components/ui/data-cards';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const smallScreen = useSmallScreen();
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
      {smallScreen ? (
        // Phones: one card per supplier instead of a table that scrolls sideways
        <>
          <DataCards
            items={rows}
            getKey={(row) => row.supplierId}
            onItemClick={(row) => setStatementOf(row)}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('Nothing is owed to suppliers.')}
          >
            {(row) => {
              const code = row.currencyCode ?? currency;
              return (
                <>
                  <DataCardHeader
                    title={row.supplierName}
                    subtitle={<span className="font-mono">{row.supplierCode}</span>}
                    onTitleClick={() => setStatementOf(row)}
                    badge={<span className="font-semibold">{formatMoney(row.balance, code)}</span>}
                  />
                  <DataCardFields>
                    {BUCKETS.filter((b) => Number(row[b.key])).map((b) => (
                      <DataCardField key={b.key} label={t(b.label)}>
                        <span className={b.key !== 'current' ? 'text-red-600' : undefined}>
                          {formatMoney(Number(row[b.key]), code)}
                        </span>
                      </DataCardField>
                    ))}
                    {!!row.unapplied && <DataCardField label={t('Unapplied')}>−{formatMoney(row.unapplied, code)}</DataCardField>}
                  </DataCardFields>
                </>
              );
            }}
          </DataCards>
          {!isLoading && rows.length > 0 && rows.every((r) => (r.currencyCode ?? currency) === currency) && (
            <div className="border-t p-4 text-sm">
              <div className="mb-2 font-semibold">{t('Total')}</div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {BUCKETS.map((b) => (
                  <div key={b.key}>
                    <dt className="text-xs text-gray-500">{t(b.label)}</dt>
                    <dd>{formatMoney(sum(rows, b.key), currency)}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-gray-500">{t('Unapplied')}</dt>
                  <dd>−{formatMoney(sum(rows, 'unapplied'), currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">{t('Balance')}</dt>
                  <dd className="font-semibold">{formatMoney(sum(rows, 'balance'), currency)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      ) : (
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
                          className={`text-right ${b.key !== 'current' && Number(row[b.key]) > 0 ? 'text-red-600' : ''}`}
                        >
                          {Number(row[b.key]) ? formatMoney(Number(row[b.key]), code) : '—'}
                        </Td>
                      ))}
                      <Td className="text-right text-gray-600">{row.unapplied ? `−${formatMoney(row.unapplied, code)}` : '—'}</Td>
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
      )}
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
  const smallScreen = useSmallScreen();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Statement: {name}', { name: data?.supplier.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('Invoices, credits and payments with the running balance.')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 sm:w-96">
          <Field label={t('From')} htmlFor="statement-from">
            <Input id="statement-from" type="date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('To')} htmlFor="statement-to">
            <Input id="statement-to" type="date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <ErrorMessage>{error ? getErrorMessage(error, 'Could not load the statement') : null}</ErrorMessage>
        {smallScreen ? (
          // Phones: one line per document with the running balance (the table scrolls sideways)
          <div id="supplier-statement" className="max-h-[50vh] divide-y overflow-y-auto rounded-md border text-sm">
            {isLoading || !data ? (
              <p className="px-3 py-6 text-center text-gray-400">{t('Loading...')}</p>
            ) : (
              <>
                <div className="flex justify-between gap-2 bg-gray-50 px-3 py-2">
                  <span>
                    {t('Opening balance on {date}', {
                      date: formatDate(data.from),
                    })}
                  </span>
                  <span className="font-medium">{formatMoney(data.openingBalance, currency)}</span>
                </div>
                {data.lines.map((line) => (
                  <div key={`${line.type}-${line.id}`} className="space-y-1 px-3 py-2">
                    <div className="flex justify-between gap-2">
                      <span className="min-w-0 break-words">
                        <span className="text-xs text-gray-500">{t(typeLabels[line.type])}</span>{' '}
                        <span className="font-mono text-xs">{line.number}</span>
                      </span>
                      <span className="whitespace-nowrap text-xs text-gray-500">{formatDate(line.date)}</span>
                    </div>
                    {line.description && (
                      <div className="break-words text-xs text-gray-600">{statementDescription(line.type, line.description)}</div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span>
                        {line.debit
                          ? `${t('Billed')} ${formatMoney(line.debit, currency)}`
                          : line.credit
                            ? `${t('Paid / credited')} ${formatMoney(line.credit, currency)}`
                            : ''}
                      </span>
                      <span className="font-medium">{formatMoney(line.balance, currency)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between gap-2 bg-gray-50 px-3 py-2 font-semibold">
                  <span>
                    {t('Closing balance on {date}', {
                      date: formatDate(data.to),
                    })}
                  </span>
                  <span>{formatMoney(data.closingBalance, currency)}</span>
                </div>
              </>
            )}
          </div>
        ) : (
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
                        {t('Opening balance on {date}', {
                          date: formatDate(data.from),
                        })}
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
                        <td className="px-3 py-2 text-gray-600">{statementDescription(line.type, line.description)}</td>
                        <td className="px-3 py-2 text-right">{line.debit ? formatMoney(line.debit, currency) : ''}</td>
                        <td className="px-3 py-2 text-right">{line.credit ? formatMoney(line.credit, currency) : ''}</td>
                        <td className="px-3 py-2 text-right">{formatMoney(line.balance, currency)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-3 py-2" colSpan={5}>
                        {t('Closing balance on {date}', {
                          date: formatDate(data.to),
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(data.closingBalance, currency)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
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
