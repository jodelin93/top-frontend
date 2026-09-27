'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CloudOff, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, THead, TBody, Th, Td, EmptyRow } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { ExchangeRateCard } from '@/components/admin/exchange-rate-card';
import { PendingInvitations } from '@/components/auth/pending-invitations';
import {
  DateRange,
  DateRangeFilter,
  endOfDayIso,
  presetRange,
  startOfDayIso,
} from '@/components/admin/reports-date-range';
import { SalesByDayChart } from '@/components/admin/reports-sales-chart';
import { BranchFilter, FreshnessNote } from '@/components/admin/reports-filters';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { reportsApi } from '@/lib/api/reports';
import { devicesApi } from '@/lib/api/devices';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t, plural } from '@/i18n';

const formatPercent = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(value);

export default function DashboardPage() {
  const currency = useCurrency();
  const [range, setRange] = useState<DateRange>(() => presetRange('7d'));
  const [branchId, setBranchId] = useState('');
  const smallScreen = useSmallScreen();

  // Group days in the browser's timezone so "today" matches the cashier's day
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const from = range.from ? startOfDayIso(range.from) : '';
  const to = range.to ? endOfDayIso(range.to) : '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', 'summary', from, to, branchId],
    queryFn: () => reportsApi.summary({ from, to, timezone, branchId: branchId || undefined }),
    enabled: !!from && !!to,
  });

  // Data freshness: tills holding sales that haven't reached the server yet
  const { data: devices } = useQuery({
    queryKey: ['devices', 'summary'],
    queryFn: () => devicesApi.summary(),
    refetchInterval: 60_000,
  });

  const totals = data?.totals;
  // Figures are per currency: the store currency on the tiles, others in their own table
  const storeCurrency = data?.currencyCode ?? currency;
  const storeMoney = (value: number) => formatMoney(value, storeCurrency);
  // Cost figures only come back for users allowed to see costs
  const showCost = !!data?.costVisible && totals?.grossProfit !== undefined;
  // Payment shares are within each currency (amounts in different currencies never add up)
  const paymentsTotals = new Map<string, number>();
  data?.byPaymentMethod.forEach((row) =>
    paymentsTotals.set(row.currencyCode, (paymentsTotals.get(row.currencyCode) ?? 0) + Number(row.amount))
  );
  const multiCurrency = paymentsTotals.size > 1 || (data?.otherCurrencies.length ?? 0) > 0;
  // Per-currency tile: the store currency's amount, other currencies as a hint
  type Amount = { currencyCode: string; amount: number; count?: number };
  const inStoreCurrency = (rows: Amount[] | null | undefined) => ({
    store: rows?.find((row) => row.currencyCode === storeCurrency),
    others: (rows ?? []).filter((row) => row.currencyCode !== storeCurrency),
  });
  const expenses = inStoreCurrency(data?.expenses);
  const cashVariance = inStoreCurrency(data?.cashVariance);
  const giftCards = inStoreCurrency(data?.giftCardsSold);
  const obligations = inStoreCurrency(
    data?.purchasingObligations?.map((row) => ({ currencyCode: row.currencyCode, amount: row.balance }))
  );
  const othersHint = (rows: Amount[]) =>
    rows.length > 0
      ? t('Also {amounts}', { amounts: rows.map((row) => formatMoney(row.amount, row.currencyCode)).join(' · ') })
      : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Dashboard')}
        description={t('Sales performance for the selected period. Detailed reports and exports are under Reports.')}
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} presets={['today', 'yesterday', '7d', '30d', 'month']} />
            <BranchFilter value={branchId} onChange={setBranchId} />
            <Button variant="outline" asChild>
              <Link href="/admin/reports">
                <FileBarChart className="h-4 w-4" />
                {t('Reports')}
              </Link>
            </Button>
          </>
        }
      />

      {/* Other stores that added this account and wait for an answer */}
      <PendingInvitations />

      {devices && !devices.dataComplete && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t('These figures may be incomplete: {sales} sale(s) are still waiting on {tills} till(s) to upload', {
              sales: devices.pendingSalesTotal,
              tills: devices.devicesWithPendingSales.length,
            })}
            {devices.devicesWithGaps.length > 0 &&
              t(', and {count} till(s) have missing sales', { count: devices.devicesWithGaps.length })}
            .{' '}
            <Link href="/admin/devices" className="underline">
              {t('See devices')}
            </Link>
          </span>
        </div>
      )}

      {/* When the figures were computed; the device warning above covers pending sales when shown */}
      <FreshnessNote freshness={data?.freshness} showWarning={!devices} />

      <ExchangeRateCard />

      {(!from || !to) && <ErrorMessage>{t('Choose both a start and an end date.')}</ErrorMessage>}
      {error && <ErrorMessage>{getErrorMessage(error, 'Could not load the report')}</ErrorMessage>}
      {isLoading && <p className="text-sm text-gray-500">{t('Loading report...')}</p>}

      {data && totals && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Kpi
              label={t('Net sales')}
              value={storeMoney(totals.netSales)}
              hint={t('Excl. tax, after discounts and returns')}
            />
            <Kpi label={t('Gross sales')} value={storeMoney(totals.grossSales)} hint={t('Excl. tax')} />
            <Kpi label={t('Discounts given')} value={storeMoney(totals.discounts)} hint={t('Excl. tax')} />
            <Kpi label={t('Returns')} value={`${storeMoney(totals.returns)} (${totals.returnCount})`} hint={t('Excl. tax')} />
            <Kpi label={t('Net tax')} value={storeMoney(totals.netTax)} hint={t('Tax on sales minus tax refunded')} />
            <Kpi label={t('Sales')} value={totals.saleCount.toLocaleString()} />
            <Kpi label={t('Average order value')} value={storeMoney(totals.averageOrderValue)} hint={t('Net sales per sale')} />
            <Kpi label={t('Items sold')} value={Number(totals.itemsSold).toLocaleString(undefined, { maximumFractionDigits: 4 })} />
            <Kpi
              label={t('Total collected (incl. tax)')}
              value={storeMoney(totals.totalCollectedInclTax)}
              hint={t('Sales minus refunds, tax included')}
            />
            {showCost && (
              <Kpi
                label={t('Gross profit')}
                value={storeMoney(totals.grossProfit ?? 0)}
                hint={
                  totals.margin !== null && totals.margin !== undefined
                    ? t('{percent} margin', { percent: formatPercent(totals.margin) })
                    : undefined
                }
              />
            )}
            <Kpi label={t('Voided sales')} value={totals.voidedCount.toLocaleString()} />
            <Kpi
              label={t('Expenses')}
              value={storeMoney(expenses.store?.amount ?? 0)}
              hint={
                othersHint(expenses.others) ??
                t('Approved and paid, in the period')
              }
            />
            <Kpi
              label={t('Cash variance')}
              value={`${(cashVariance.store?.amount ?? 0) > 0 ? '+' : ''}${storeMoney(cashVariance.store?.amount ?? 0)}`}
              hint={
                othersHint(cashVariance.others) ??
                t('{count} closed shift(s)', { count: cashVariance.store?.count ?? 0 })
              }
              className={cn(Math.abs(cashVariance.store?.amount ?? 0) >= 0.005 && 'border-amber-300 bg-amber-50')}
            />
            {(data.giftCardsSold?.length ?? 0) > 0 && (
              <Kpi
                label={t('Gift cards sold')}
                value={storeMoney(giftCards.store?.amount ?? 0)}
                hint={
                  othersHint(giftCards.others) ??
                  t('{count} card(s) · stored value, not in sales', { count: giftCards.store?.count ?? 0 })
                }
              />
            )}
            {data.inventoryValue !== null && data.inventoryValue !== undefined && (
              <Kpi label={t('Inventory value')} value={storeMoney(data.inventoryValue)} hint={t('Stock on hand at cost')} />
            )}
            {data.purchasingObligations && (
              <Link href="/admin/purchasing" className="block rounded-xl hover:ring-2 hover:ring-blue-200">
                <Kpi
                  label={t('Owed to suppliers')}
                  value={storeMoney(obligations.store?.amount ?? 0)}
                  hint={
                    othersHint(obligations.others) ??
                    t('Open supplier balance')
                  }
                />
              </Link>
            )}
            <Link href="/admin/inventory" className="block rounded-xl hover:ring-2 hover:ring-blue-200">
              <Kpi
                label={t('Low stock')}
                value={totals.lowStockCount.toLocaleString()}
                hint={t('View inventory →')}
                className={cn(totals.lowStockCount > 0 && 'border-yellow-300 bg-yellow-50')}
                icon={totals.lowStockCount > 0 ? <AlertTriangle className="h-4 w-4 text-yellow-600" /> : undefined}
              />
            </Link>
          </div>

          {multiCurrency && (
            <p className="text-xs text-gray-500">
              {t('The figures above are in {currency}. Sales in other currencies are shown separately and never added to them.', {
                currency: storeCurrency,
              })}
            </p>
          )}

          {data.otherCurrencies.length > 0 && (
            <Section title={t('Sales in other currencies')}>
              {smallScreen ? (
                <DataCards items={data.otherCurrencies} getKey={(row) => row.currencyCode}>
                  {(row) => {
                    const m = (value: number) => formatMoney(value, row.currencyCode);
                    return (
                      <>
                        <DataCardHeader
                          title={row.currencyCode}
                          subtitle={plural(row.saleCount, '{count} sale', '{count} sales')}
                        />
                        <DataCardFields>
                          <DataCardField label={t('Net sales (excl. tax)')}>{m(row.netSales)}</DataCardField>
                          <DataCardField label={t('Net tax')}>{m(row.netTax)}</DataCardField>
                          <DataCardField label={t('Average order value')}>{m(row.averageOrderValue)}</DataCardField>
                          <DataCardField label={t('Total collected (incl. tax)')}>{m(row.totalCollectedInclTax)}</DataCardField>
                          {showCost && <DataCardField label={t('Gross profit')}>{m(row.grossProfit ?? 0)}</DataCardField>}
                        </DataCardFields>
                      </>
                    );
                  }}
                </DataCards>
              ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>{t('Currency')}</Th>
                    <Th className="text-right">{t('Sales')}</Th>
                    <Th className="text-right">{t('Net sales (excl. tax)')}</Th>
                    <Th className="text-right">{t('Net tax')}</Th>
                    <Th className="text-right">{t('Average order value')}</Th>
                    <Th className="text-right">{t('Total collected (incl. tax)')}</Th>
                    {showCost && <Th className="text-right">{t('Gross profit')}</Th>}
                  </tr>
                </THead>
                <TBody>
                  {data.otherCurrencies.map((row) => {
                    const m = (value: number) => formatMoney(value, row.currencyCode);
                    return (
                      <tr key={row.currencyCode}>
                        <Td className="font-medium">{row.currencyCode}</Td>
                        <Td className="text-right">{row.saleCount.toLocaleString()}</Td>
                        <Td className="text-right">{m(row.netSales)}</Td>
                        <Td className="text-right">{m(row.netTax)}</Td>
                        <Td className="text-right">{m(row.averageOrderValue)}</Td>
                        <Td className="text-right">{m(row.totalCollectedInclTax)}</Td>
                        {showCost && <Td className="text-right">{m(row.grossProfit ?? 0)}</Td>}
                      </tr>
                    );
                  })}
                </TBody>
              </Table>
              )}
            </Section>
          )}

          <Section title={t('Sales by day')} hint={t('Net sales excl. tax, in {currency}', { currency: storeCurrency })}>
            <div className="p-4">
              <SalesByDayChart byDay={data.byDay} from={range.from} to={range.to} currency={storeCurrency} />
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t('Payment methods')}>
              {data.byPaymentMethod.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-400">{t('No payments in this period')}</p>
              ) : (
                <ul className="divide-y">
                  {data.byPaymentMethod.map((row) => {
                    const currencyTotal = paymentsTotals.get(row.currencyCode) ?? 0;
                    const share = currencyTotal > 0 ? Number(row.amount) / currencyTotal : 0;
                    return (
                      <li key={`${row.paymentMethodId}-${row.currencyCode}`} className="space-y-1.5 px-4 py-3 text-sm">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium">
                            {row.name}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                              {plural(row.count, '{count} payment', '{count} payments')}
                            </span>
                          </span>
                          <span>
                            {formatMoney(row.amount, row.currencyCode)}
                            <span className="ml-2 text-xs text-gray-500">{formatPercent(share)}</span>
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${share * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title={t('Sales by cashier')} hint={t('Net sales excl. tax, in {currency}', { currency: storeCurrency })}>
              {smallScreen ? (
                // Phones: a plain list (name, sales count / net sales) instead of a table
                data.byCashier.length === 0 ? (
                  <p className="px-4 py-10 text-center text-sm text-gray-400">{t('No sales in this period')}</p>
                ) : (
                  <ul className="divide-y">
                    {data.byCashier.map((row) => (
                      <li key={row.userId} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0 break-words">
                          <div className="font-medium">{row.name || row.email}</div>
                          {row.name && <div className="text-xs text-gray-500">{row.email}</div>}
                        </div>
                        <div className="shrink-0 text-right">
                          <div>{storeMoney(row.total)}</div>
                          <div className="text-xs text-gray-500">{plural(row.saleCount, '{count} sale', '{count} sales')}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
              <Table>
                <THead>
                  <tr>
                    <Th>{t('Cashier')}</Th>
                    <Th className="text-right">{t('Sales')}</Th>
                    <Th className="text-right">{t('Net sales')}</Th>
                  </tr>
                </THead>
                <TBody>
                  {data.byCashier.length === 0 ? (
                    <EmptyRow colSpan={3}>{t('No sales in this period')}</EmptyRow>
                  ) : (
                    data.byCashier.map((row) => (
                      <tr key={row.userId}>
                        <Td>
                          <div className="font-medium">{row.name || row.email}</div>
                          {row.name && <div className="text-xs text-gray-500">{row.email}</div>}
                        </Td>
                        <Td className="text-right">{row.saleCount}</Td>
                        <Td className="text-right">{storeMoney(row.total)}</Td>
                      </tr>
                    ))
                  )}
                </TBody>
              </Table>
              )}
            </Section>
          </div>

          <Section title={t('Top products')} hint={t('Revenue excl. tax, in {currency}', { currency: storeCurrency })}>
            {smallScreen ? (
              data.topProducts.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-400">{t('No sales in this period')}</p>
              ) : (
                <ul className="divide-y">
                  {data.topProducts.map((row) => (
                    <li key={row.variantId} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 break-words">
                        <div className="font-medium">
                          {row.productName}
                          {row.variantName && <span className="font-normal text-gray-500"> · {row.variantName}</span>}
                        </div>
                        <div className="font-mono text-xs text-gray-500">{row.sku}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div>{storeMoney(row.revenue)}</div>
                        <div className="text-xs text-gray-500">
                          {t('Quantity')}: {Number(row.quantity).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : (
            <Table>
              <THead>
                <tr>
                  <Th>{t('Product')}</Th>
                  <Th>{t('SKU')}</Th>
                  <Th className="text-right">{t('Quantity')}</Th>
                  <Th className="text-right">{t('Revenue (excl. tax)')}</Th>
                </tr>
              </THead>
              <TBody>
                {data.topProducts.length === 0 ? (
                  <EmptyRow colSpan={4}>{t('No sales in this period')}</EmptyRow>
                ) : (
                  data.topProducts.map((row) => (
                    <tr key={row.variantId}>
                      <Td className="font-medium">
                        {row.productName}
                        {row.variantName && <span className="font-normal text-gray-500"> · {row.variantName}</span>}
                      </Td>
                      <Td className="font-mono text-xs">{row.sku}</Td>
                      <Td className="text-right">{Number(row.quantity).toLocaleString()}</Td>
                      <Td className="text-right">{storeMoney(row.revenue)}</Td>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('h-full bg-white p-4', className)}>
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase text-gray-500">
        {label}
        {icon}
      </div>
      <div className="mt-1 truncate text-xl font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </Card>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden bg-white">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">
        {title}
        {hint && <span className="ml-2 text-xs font-normal text-gray-500">{hint}</span>}
      </h2>
      {children}
    </Card>
  );
}
