'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { CustomerDetailDialog } from '@/components/admin/customer-detail-dialog';
import { useApproval } from '@/components/approval-dialog';
import { AGING_COLUMNS, customerAccountsApi } from '@/lib/api/customer-accounts';
import { StoredValueAccount, storedValueApi } from '@/lib/api/stored-value';
import { Customer, customerName, customersApi } from '@/lib/api/customers';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { useHelpContext } from '@/help/store';

type Tab = 'aging' | 'stored';

/**
 * Customer accounts (D019): who owes what and for how long (aging), and the
 * gift cards / store credit the store owes its customers
 */
export default function CustomerAccountsPage() {
  const [tab, setTab] = useState<Tab>('aging');
  useHelpContext(tab === 'stored' ? 'customers-gift-cards' : 'customers-accounts');
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Customer accounts')}
        description={t('Balances on account by age, and gift cards and store credit.')}
      />
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {(
          [
            ['aging', t('Aging')],
            ['stored', t('Gift cards & store credit')],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm max-md:py-2.5',
              tab === key ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'aging' ? <AgingTable /> : <StoredValueTable />}
    </div>
  );
}

function AgingTable() {
  const currency = useCurrency();
  const money = (value: number) => formatMoney(value, currency);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [nonZero, setNonZero] = useState<'true' | 'false'>('true');
  const [viewing, setViewing] = useState<Customer | null>(null);
  const smallScreen = useSmallScreen();
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-accounts', 'aging', debounced, nonZero],
    queryFn: () => customerAccountsApi.aging({ search: debounced || undefined, nonZero }),
    placeholderData: keepPreviousData,
  });
  const open = async (customerId: string) => setViewing(await customersApi.get(customerId));

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('Search by name or code...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={nonZero}
          onChange={(e) => setNonZero(e.target.value as 'true' | 'false')}
          className="sm:w-56"
          aria-label={t('Which accounts')}
        >
          <option value="true">{t('With a balance')}</option>
          <option value="false">{t('All accounts')}</option>
        </Select>
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load the accounts')}</ErrorMessage>
        </div>
      )}
      {smallScreen ? (
        <>
          <DataCards
            items={data?.rows ?? []}
            getKey={(row) => row.customerId}
            loading={isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No customer owes anything.')}
          >
            {(row) => (
              <>
                <DataCardHeader
                  title={row.name}
                  subtitle={<span className="font-mono">{row.code}</span>}
                  onTitleClick={() => open(row.customerId)}
                  badge={row.creditHold && <Badge variant="danger">{t('On credit hold')}</Badge>}
                />
                <DataCardFields>
                  <DataCardField label={t('Balance')}>
                    <span className="font-semibold">{money(row.balance)}</span>
                  </DataCardField>
                  <DataCardField label={t('Credit limit')}>
                    <span className="text-gray-500">{money(row.creditLimit)}</span>
                  </DataCardField>
                  {/* Only the age buckets that hold money, to keep the card short */}
                  {AGING_COLUMNS.filter(([key]) => row.aging[key]).map(([key, label]) => (
                    <DataCardField key={key} label={t(label)}>
                      <span className={cn(key !== 'current' && row.aging[key] > 0 && 'text-red-600')}>
                        {money(row.aging[key])}
                      </span>
                    </DataCardField>
                  ))}
                </DataCardFields>
              </>
            )}
          </DataCards>
          {!isLoading && !!data?.rows.length && (
            <div className="space-y-1 border-t bg-gray-50 p-4 text-sm">
              {AGING_COLUMNS.map(([key, label]) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-gray-600">{t(label)}</span>
                  <span>{money(data.totals[key])}</span>
                </div>
              ))}
              <div className="flex justify-between gap-2 font-semibold">
                <span>{t('Total')}</span>
                <span>{money(data.totals.total)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Customer')}</Th>
            {AGING_COLUMNS.map(([key, label]) => (
              <Th key={key} className="text-right">
                {t(label)}
              </Th>
            ))}
            <Th className="text-right">{t('Balance')}</Th>
            <Th className="text-right">{t('Credit limit')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
          ) : !data?.rows.length ? (
            <EmptyRow colSpan={8}>{t('No customer owes anything.')}</EmptyRow>
          ) : (
            <>
              {data.rows.map((row) => (
                <tr key={row.customerId} className="hover:bg-gray-50">
                  <Td>
                    <button type="button" className="text-left font-medium hover:underline" onClick={() => open(row.customerId)}>
                      {row.name}
                    </button>
                    <span className="block font-mono text-xs text-gray-500">{row.code}</span>
                    {row.creditHold && <Badge variant="danger">{t('On credit hold')}</Badge>}
                  </Td>
                  {AGING_COLUMNS.map(([key]) => (
                    <Td key={key} className={cn('text-right', key !== 'current' && row.aging[key] > 0 && 'text-red-600')}>
                      {row.aging[key] ? money(row.aging[key]) : '—'}
                    </Td>
                  ))}
                  <Td className="text-right font-semibold">{money(row.balance)}</Td>
                  <Td className="text-right text-gray-500">{money(row.creditLimit)}</Td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <Td>{t('Total')}</Td>
                {AGING_COLUMNS.map(([key]) => (
                  <Td key={key} className="text-right">
                    {money(data.totals[key])}
                  </Td>
                ))}
                <Td className="text-right">{money(data.totals.total)}</Td>
                <Td />
              </tr>
            </>
          )}
        </TBody>
      </Table>
      )}
      <CustomerDetailDialog customer={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}

function StoredValueTable() {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const user = useAuthStore((state) => state.user);
  const canAdjust = hasPermission(user, 'customers.credit.manage');
  const [type, setType] = useState<'' | 'gift_card' | 'store_credit'>('');
  const [last4, setLast4] = useState('');
  const [adjusting, setAdjusting] = useState<StoredValueAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(newIdempotencyKey);
  // Large credits need a second person's approval, even with customers.credit.manage
  const { withApproval, approvalDialog } = useApproval();
  const smallScreen = useSmallScreen();

  // Expiry is judged at the time the list was loaded
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['stored-value', type, last4],
    queryFn: () => storedValueApi.list({ type: type || undefined, last4: last4.trim() || undefined, limit: 50 }),
    placeholderData: keepPreviousData,
  });
  const adjust = useMutation({
    mutationFn: () =>
      withApproval((headers) =>
        storedValueApi.adjust(
          adjusting!.id,
          { amount: Math.round(Number(amount) * 100) / 100, reason: reason.trim() },
          key,
          headers
        )
      ),
    onSuccess: () => {
      setAdjusting(null);
      setAmount('');
      setReason('');
      setKey(newIdempotencyKey());
      queryClient.invalidateQueries({ queryKey: ['stored-value'] });
    },
  });
  const statusLabel = (status: StoredValueAccount['status']) =>
    status === 'active' ? t('Active') : status === 'pending' ? t('Not active yet') : t('Cancelled');

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="sm:w-48" aria-label={t('Type')}>
          <option value="">{t('All')}</option>
          <option value="gift_card">{t('Gift cards')}</option>
          <option value="store_credit">{t('Store credit')}</option>
        </Select>
        <Input
          value={last4}
          onChange={(e) => setLast4(e.target.value)}
          maxLength={4}
          placeholder={t('Last 4 of the card')}
          aria-label={t('Last 4 of the card')}
          className="sm:w-48"
        />
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load gift cards')}</ErrorMessage>
        </div>
      )}
      {adjusting && (
        <form
          className="flex flex-wrap items-end gap-2 border-b bg-gray-50 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            adjust.mutate();
          }}
        >
          <span className="text-sm font-medium">
            {adjusting.accountType === 'gift_card'
              ? t('Gift card ending {last4}', { last4: adjusting.last4 ?? '' })
              : t('Store credit')}
          </span>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={t('+25.00 or -10.00')}
            aria-label={t('Amount')}
            className="w-36"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('Reason (required)')}
            aria-label={t('Reason')}
            className="min-w-64 flex-1 max-md:min-w-0 max-md:basis-full"
          />
          <Button type="submit" disabled={adjust.isPending || !Number(amount) || !reason.trim()}>
            {t('Adjust')}
          </Button>
          <Button type="button" variant="outline" onClick={() => setAdjusting(null)}>
            {t('Cancel')}
          </Button>
          <div className="w-full">
            <ErrorMessage>{adjust.error ? getErrorMessage(adjust.error, 'Could not adjust') : null}</ErrorMessage>
          </div>
        </form>
      )}
      {smallScreen ? (
        <DataCards
          items={data?.data ?? []}
          getKey={(account) => account.id}
          loading={isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No gift cards or store credit yet.')}
        >
          {(account) => (
            <>
              <DataCardHeader
                title={
                  account.accountType === 'gift_card'
                    ? `**** ${account.last4 ?? ''}`
                    : account.customer
                      ? customerName(account.customer)
                      : '—'
                }
                subtitle={account.accountType === 'gift_card' ? t('Gift card') : t('Store credit')}
                badge={
                  <Badge variant={account.status === 'active' ? 'success' : account.status === 'pending' ? 'warning' : 'default'}>
                    {statusLabel(account.status)}
                  </Badge>
                }
              />
              <DataCardFields>
                <DataCardField label={t('Balance')}>
                  <span className="font-semibold">{formatMoney(Number(account.balance), account.currencyCode || currency)}</span>
                </DataCardField>
                {account.accountType === 'gift_card' && (
                  <DataCardField label={t('Initial value')}>
                    {formatMoney(Number(account.initialAmount), account.currencyCode || currency)}
                  </DataCardField>
                )}
                <DataCardField label={t('Issued')}>{formatDateTime(account.createdAt)}</DataCardField>
                {account.accountType === 'gift_card' && (
                  <DataCardField label={t('Expires')}>
                    {account.expiresAt ? (
                      <span className={cn(Date.parse(account.expiresAt) <= dataUpdatedAt && 'text-red-600')}>
                        {formatDate(account.expiresAt)}
                        {Date.parse(account.expiresAt) <= dataUpdatedAt && ` · ${t('Expired')}`}
                      </span>
                    ) : (
                      <span className="text-gray-400">{t('Never')}</span>
                    )}
                  </DataCardField>
                )}
              </DataCardFields>
              {canAdjust && account.status === 'active' && (
                <DataCardActions>
                  <Button variant="ghost" size="sm" onClick={() => setAdjusting(account)}>
                    {t('Adjust')}
                  </Button>
                </DataCardActions>
              )}
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Type')}</Th>
            <Th>{t('Card / customer')}</Th>
            <Th>{t('Issued')}</Th>
            <Th>{t('Expires')}</Th>
            <Th className="text-right">{t('Initial value')}</Th>
            <Th className="text-right">{t('Balance')}</Th>
            <Th>{t('Status')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
          ) : !data?.data.length ? (
            <EmptyRow colSpan={8}>{t('No gift cards or store credit yet.')}</EmptyRow>
          ) : (
            data.data.map((account) => (
              <tr key={account.id}>
                <Td>{account.accountType === 'gift_card' ? t('Gift card') : t('Store credit')}</Td>
                <Td>
                  {account.accountType === 'gift_card'
                    ? `**** ${account.last4 ?? ''}`
                    : account.customer
                      ? customerName(account.customer)
                      : '—'}
                </Td>
                <Td className="whitespace-nowrap">{formatDateTime(account.createdAt)}</Td>
                <Td className="whitespace-nowrap">
                  {account.accountType !== 'gift_card' ? (
                    '—'
                  ) : account.expiresAt ? (
                    <span className={cn(Date.parse(account.expiresAt) <= dataUpdatedAt && 'text-red-600')}>
                      {formatDate(account.expiresAt)}
                      {Date.parse(account.expiresAt) <= dataUpdatedAt && ` · ${t('Expired')}`}
                    </span>
                  ) : (
                    <span className="text-gray-400">{t('Never')}</span>
                  )}
                </Td>
                <Td className="text-right">
                  {account.accountType === 'gift_card' ? formatMoney(Number(account.initialAmount), account.currencyCode || currency) : '—'}
                </Td>
                <Td className="text-right font-semibold">{formatMoney(Number(account.balance), account.currencyCode || currency)}</Td>
                <Td>
                  <Badge variant={account.status === 'active' ? 'success' : account.status === 'pending' ? 'warning' : 'default'}>
                    {statusLabel(account.status)}
                  </Badge>
                </Td>
                <Td>
                  {canAdjust && account.status === 'active' && (
                    <Button variant="ghost" size="sm" onClick={() => setAdjusting(account)}>
                      {t('Adjust')}
                    </Button>
                  )}
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}
      {approvalDialog}
    </Card>
  );
}
