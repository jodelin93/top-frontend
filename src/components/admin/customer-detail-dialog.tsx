'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { Customer, customerFieldsApi, customerName, customersApi } from '@/lib/api/customers';
import { formatCustomFieldValue } from '@/components/admin/customer-custom-fields';
import { salesApi } from '@/lib/api/sales';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { CustomerLoyaltyPanel } from '@/components/admin/customer-loyalty-panel';
import { CustomerAccountPanel } from '@/components/admin/customer-account-panel';
import {
  CustomerActivityPanel,
  CustomerAddressesPanel,
  CustomerNotesPanel,
} from '@/components/admin/customer-profile-panels';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { currentLocale, t } from '@/i18n';
import { translateServerNote } from '@/lib/server-texts';

// English labels, translated at render
const STATUS_LABELS: Record<string, string> = { active: 'Active', inactive: 'Inactive', blocked: 'Blocked' };
const TYPE_LABELS: Record<string, string> = { individual: 'Individual', business: 'Business' };

type Tab = 'details' | 'account' | 'addresses' | 'notes' | 'activity';

interface CustomerDetailDialogProps {
  // Customer to show; null keeps the dialog closed
  customer: Customer | null;
  onClose: () => void;
}

export function CustomerDetailDialog({ customer, onClose }: CustomerDetailDialogProps) {
  const currency = useCurrency();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canAnonymise = hasPermission(user, 'customers.manage') && !customer?.metadata?.anonymisedAt;
  const anonymise = useMutation({
    mutationFn: (id: string) => customersApi.anonymize(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // The customer shown here still has the old details
      onClose();
    },
  });
  // The tab chosen for this customer (back to Details for another one)
  const [chosen, setChosen] = useState<{ id: string | null; tab: Tab }>({ id: null, tab: 'details' });
  const tab: Tab = chosen.id === customer?.id ? chosen.tab : 'details';
  const tabs: [Tab, string, boolean][] = [
    ['details', t('Details'), true],
    ['account', t('Account'), hasPermission(user, 'customers.finance.view')],
    ['addresses', t('Addresses & contacts'), true],
    ['notes', t('Notes'), true],
    ['activity', t('Activity'), true],
  ];

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ['sales', { customerId: customer?.id, limit: 20 }],
    queryFn: () => salesApi.list({ customerId: customer!.id, limit: 20 }),
    enabled: !!customer,
  });
  const { data: consentEvents = [] } = useQuery({
    queryKey: ['customer-consent', customer?.id],
    queryFn: () => customersApi.consentEvents(customer!.id),
    enabled: !!customer,
  });
  const { data: fieldDefinitions = [] } = useQuery({
    queryKey: ['customer-fields'],
    queryFn: () => customerFieldsApi.list(),
    enabled: !!customer,
  });
  const { data: mergedRecords = [] } = useQuery({
    queryKey: ['customer-merged-records', customer?.id],
    queryFn: () => customersApi.mergedRecords(customer!.id),
    enabled: !!customer,
  });
  const customValues = customer?.metadata?.customFields ?? {};
  const shownFields = fieldDefinitions.filter((d) => d.isActive || customValues[d.key] !== undefined);

  const details: [string, string][] = customer
    ? [
        [t('Email'), customer.email ?? '—'],
        [t('Phone'), customer.phone ?? '—'],
        [t('Company'), customer.companyName ?? '—'],
        // Personal details are left out for users who may not see them
        ...(customer.taxNumber !== undefined ? [[t('Tax number'), customer.taxNumber ?? '—'] as [string, string]] : []),
        ...(customer.dateOfBirth !== undefined ? [[t('Date of birth'), formatDate(customer.dateOfBirth)] as [string, string]] : []),
        [t('Loyalty points'), Number(customer.loyaltyPoints).toLocaleString(currentLocale())],
        // Only sent to users allowed to see customer finances
        [t('Balance'), customer.currentBalance == null ? '—' : formatMoney(customer.currentBalance, currency)],
        [t('Credit limit'), customer.creditLimit == null ? '—' : formatMoney(customer.creditLimit, currency)],
        [
          t('Payment terms'),
          customer.paymentTermDays != null
            ? t('{days} days', { days: customer.paymentTermDays })
            : customer.group?.defaultPaymentTermDays != null
              ? t('{days} days', { days: customer.group.defaultPaymentTermDays })
              : '—',
        ],
        [t('Credit hold'), customer.creditHold ? t('Yes') : t('No')],
        [t('Group'), customer.group?.name ?? '—'],
        [t('Customer since'), formatDate(customer.createdAt)],
        [t('Last purchase'), formatDateTime(customer.lastPurchaseAt)],
      ]
    : [];

  return (
    <Dialog open={!!customer} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        {customer && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {customerName(customer)}
                <Badge variant={statusVariant(customer.status)}>{t(STATUS_LABELS[customer.status] ?? customer.status)}</Badge>
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono">{customer.code}</span> ·{' '}
                <span className="capitalize">{t(TYPE_LABELS[customer.customerType] ?? customer.customerType)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-1 border-b" role="tablist">
              {tabs
                .filter(([, , show]) => show)
                .map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={tab === key}
                    onClick={() => setChosen({ id: customer.id, tab: key })}
                    className={cn(
                      '-mb-px border-b-2 px-3 py-2 text-sm',
                      tab === key ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {label}
                  </button>
                ))}
            </div>

            {tab === 'account' && <CustomerAccountPanel customerId={customer.id} />}
            {tab === 'addresses' && <CustomerAddressesPanel customerId={customer.id} />}
            {tab === 'notes' && <CustomerNotesPanel customerId={customer.id} />}
            {tab === 'activity' && <CustomerActivityPanel customerId={customer.id} />}

            {tab === 'details' && (
            <>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {customer.mergedIntoId && (
              <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                {t('This record was merged into another customer and is no longer used.')}
              </p>
            )}

            {shownFields.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{t('More details')}</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  {shownFields.map((d) => (
                    <div key={d.id}>
                      <dt className="text-xs text-gray-500">{d.label}</dt>
                      <dd className="font-medium">{formatCustomFieldValue(d, customValues[d.key])}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('Marketing consent')}</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant={customer.marketingEmailConsent ? 'success' : 'default'}>
                  {customer.marketingEmailConsent ? t('Email: yes') : t('Email: no')}
                </Badge>
                <Badge variant={customer.marketingSmsConsent ? 'success' : 'default'}>
                  {customer.marketingSmsConsent ? t('SMS: yes') : t('SMS: no')}
                </Badge>
                {customer.consentUpdatedAt && (
                  <span className="text-xs text-gray-500">
                    {customer.consentSource
                      ? t('Updated {date} via {source}', {
                          date: formatDateTime(customer.consentUpdatedAt),
                          source: customer.consentSource,
                        })
                      : t('Updated {date}', { date: formatDateTime(customer.consentUpdatedAt) })}
                  </span>
                )}
              </div>
              {consentEvents.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600">
                    {t('History ({count})', { count: consentEvents.length })}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {consentEvents.map((event) => (
                      <li key={event.id} className="text-xs text-gray-700">
                        {formatDateTime(event.createdAt)} —{' '}
                        {event.channel === 'email'
                          ? event.granted
                            ? t('Email granted')
                            : t('Email withdrawn')
                          : event.granted
                            ? t('SMS granted')
                            : t('SMS withdrawn')}
                        {event.source ? ` (${event.source})` : ''}
                        {event.note ? ` — ${translateServerNote(event.note)}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {mergedRecords.length > 0 && (
              <p className="text-xs text-gray-500">
                {t('Merged from: {records}', {
                  records: mergedRecords.map((m) => `${customerName(m)} (${m.code})`).join(', '),
                })}
              </p>
            )}

            {customer.metadata?.anonymisedAt && (
              <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                {t('This customer was anonymised on {date}.', { date: formatDateTime(customer.metadata.anonymisedAt) })}
              </p>
            )}

            <CustomerLoyaltyPanel customerId={customer.id} />

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t('Recent purchases')}</h3>
              {error && <ErrorMessage>{getErrorMessage(error, 'Could not load purchases')}</ErrorMessage>}
              <div className="rounded-md border">
                <Table>
                  <THead>
                    <tr>
                      <Th>{t('Sale')}</Th>
                      <Th>{t('Date')}</Th>
                      <Th className="text-right">{t('Total')}</Th>
                      <Th>{t('Status')}</Th>
                    </tr>
                  </THead>
                  <TBody>
                    {isLoading ? (
                      <EmptyRow colSpan={4}>{t('Loading purchases...')}</EmptyRow>
                    ) : !sales?.data.length ? (
                      <EmptyRow colSpan={4}>{t('No purchases yet.')}</EmptyRow>
                    ) : (
                      sales.data.map((sale) => (
                        <tr key={sale.id}>
                          <Td className="font-mono text-xs">{sale.saleNumber}</Td>
                          <Td>{formatDateTime(sale.saleDate)}</Td>
                          <Td className="text-right">
                            {formatMoney(sale.total, sale.currencyCode || currency)}
                          </Td>
                          <Td>
                            <Badge variant={statusVariant(sale.status)}>
                              {t(sale.status.replace('_', ' '))}
                            </Badge>
                          </Td>
                        </tr>
                      ))
                    )}
                  </TBody>
                </Table>
              </div>
              {sales && sales.meta.total > sales.data.length && (
                <p className="text-xs text-gray-500">
                  {t('Showing the latest {shown} of {total} purchases.', {
                    shown: sales.data.length,
                    total: sales.meta.total,
                  })}
                </p>
              )}
            </div>

            {canAnonymise && (
              <div className="space-y-2 border-t pt-3">
                <ErrorMessage>
                  {anonymise.error ? getErrorMessage(anonymise.error, 'Could not anonymise the customer') : null}
                </ErrorMessage>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-red-600"
                  disabled={anonymise.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          'Anonymise {name}? Their name, contact details, addresses and notes are erased for good. Sales and account history are kept.',
                          { name: customerName(customer) }
                        )
                      )
                    ) {
                      anonymise.mutate(customer.id);
                    }
                  }}
                >
                  {anonymise.isPending ? t('Anonymising...') : t('Anonymise')}
                </Button>
              </div>
            )}
            </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
