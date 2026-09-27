'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { today } from '@/components/admin/purchasing-invoices';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import {
  Allocation,
  payablesApi,
  SupplierCredit,
  supplierCreditsApi,
  SupplierPayment,
  SupplierPaymentMethod,
  supplierPaymentsApi,
} from '@/lib/api/purchasing';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

export const paymentMethodLabels: Record<SupplierPaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  check: 'Cheque',
  card: 'Card',
  mobile_money: 'Mobile money',
  other: 'Other',
};

const toCents = (value: number) => Math.round(value * 100);

/**
 * Supplier payments and credits, and their allocation to invoices
 */
export function SupplierPaymentsTab() {
  const user = useAuthStore((s) => s.user);
  const canRecord = hasPermission(user, 'purchasing.payables');
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState('');
  const [dialog, setDialog] = useState<
    | { kind: 'payment' }
    | { kind: 'credit' }
    | { kind: 'allocate-payment'; payment: SupplierPayment }
    | { kind: 'allocate-credit'; credit: SupplierCredit }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const payments = useQuery({
    queryKey: ['supplier-payments', supplierId],
    queryFn: () => supplierPaymentsApi.list({ supplierId: supplierId || undefined }),
  });
  const credits = useQuery({
    queryKey: ['supplier-credits', supplierId],
    queryFn: () => supplierCreditsApi.list({ supplierId: supplierId || undefined }),
  });

  const refresh = async () => {
    for (const key of ['supplier-payments', 'supplier-credits', 'supplier-invoices', 'payables']) {
      await queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const voidDocument = useMutation({
    mutationFn: async (target: { kind: 'payment' | 'credit'; id: string }) => {
      const reason = window.prompt(
        target.kind === 'payment'
          ? t('Void this payment? Its allocations to invoices are removed. Reason (required):')
          : t('Void this credit? Reason (required):')
      );
      if (reason === null) throw new Error('cancelled');
      if (!reason.trim()) throw new Error(t('A reason is required.'));
      return target.kind === 'payment'
        ? supplierPaymentsApi.void(target.id, reason.trim())
        : supplierCreditsApi.void(target.id, reason.trim());
    },
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: (err) => {
      if (err instanceof Error && err.message === 'cancelled') return;
      setError(err instanceof Error && !('response' in err) ? err.message : getErrorMessage(err, 'Could not void it'));
    },
  });

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="lg:w-60"
            aria-label={t('Filter by supplier')}
          >
            <option value="">{t('All suppliers')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <div className="flex-1" />
          {canRecord && (
            <>
              <Button variant="outline" onClick={() => setDialog({ kind: 'credit' })} disabled={suppliers.length === 0}>
                <Plus className="h-4 w-4" />
                {t('New credit')}
              </Button>
              <Button
                onClick={() => setDialog({ kind: 'payment' })}
                disabled={suppliers.length === 0}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                {t('New payment')}
              </Button>
            </>
          )}
        </div>
        {(error || payments.error) && (
          <div className="m-4">
            <ErrorMessage>{error ?? getErrorMessage(payments.error, 'Could not load payments')}</ErrorMessage>
          </div>
        )}
        <div className="px-4 pt-3 text-sm font-medium">{t('Payments')}</div>
        {smallScreen ? (
          // Phones: one card per payment instead of a table that scrolls sideways
          <DataCards
            items={payments.data ?? []}
            getKey={(p) => p.id}
            loading={payments.isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No supplier payments yet.')}
          >
            {(p) => (
              <>
                <DataCardHeader
                  title={<span className="font-mono text-xs">{p.paymentNumber}</span>}
                  subtitle={p.supplier?.name ?? '—'}
                  badge={p.status === 'void' && <Badge variant="danger">{t('Void')}</Badge>}
                />
                <DataCardFields>
                  <DataCardField label={t('Date')}>{formatDate(p.paymentDate)}</DataCardField>
                  <DataCardField label={t('Method')}>
                    {t(paymentMethodLabels[p.method])}
                    {p.reference && <div className="text-xs text-gray-500">{p.reference}</div>}
                  </DataCardField>
                  <DataCardField label={t('Amount')}>
                    <span className="font-medium">{formatMoney(p.amount, p.currencyCode)}</span>
                  </DataCardField>
                  <DataCardField label={t('Unallocated')}>{formatMoney(p.amountUnallocated, p.currencyCode)}</DataCardField>
                </DataCardFields>
                {canRecord && p.status === 'posted' && (
                  <DataCardActions>
                    {p.amountUnallocated > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'allocate-payment', payment: p })}>
                        {t('Allocate')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => voidDocument.mutate({ kind: 'payment', id: p.id })}
                    >
                      {t('Void')}
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
                <Th>{t('Payment')}</Th>
                <Th>{t('Supplier')}</Th>
                <Th>{t('Date')}</Th>
                <Th>{t('Method')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th className="text-right">{t('Unallocated')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {payments.isLoading ? (
                <EmptyRow colSpan={7}>{t('Loading...')}</EmptyRow>
              ) : (payments.data ?? []).length === 0 ? (
                <EmptyRow colSpan={7}>{t('No supplier payments yet.')}</EmptyRow>
              ) : (
                payments.data!.map((p) => (
                  <tr key={p.id}>
                    <Td className="font-mono text-xs font-medium">
                      {p.paymentNumber}
                      {p.status === 'void' && (
                        <Badge variant="danger" className="ml-1">
                          {t('Void')}
                        </Badge>
                      )}
                    </Td>
                    <Td>{p.supplier?.name ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDate(p.paymentDate)}</Td>
                    <Td>
                      {t(paymentMethodLabels[p.method])}
                      {p.reference && <div className="text-xs text-gray-500">{p.reference}</div>}
                    </Td>
                    <Td className="text-right">{formatMoney(p.amount, p.currencyCode)}</Td>
                    <Td className="text-right">{formatMoney(p.amountUnallocated, p.currencyCode)}</Td>
                    <Td>
                      {canRecord && p.status === 'posted' && (
                        <div className="flex justify-end gap-1">
                          {p.amountUnallocated > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDialog({
                                  kind: 'allocate-payment',
                                  payment: p,
                                })
                              }
                            >
                              {t('Allocate')}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => voidDocument.mutate({ kind: 'payment', id: p.id })}
                          >
                            {t('Void')}
                          </Button>
                        </div>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="bg-white">
        <div className="px-4 pt-3 text-sm font-medium">{t('Supplier credits')}</div>
        {smallScreen ? (
          <DataCards
            items={credits.data ?? []}
            getKey={(c) => c.id}
            loading={credits.isLoading}
            loadingText={t('Loading...')}
            emptyText={t('No supplier credits yet.')}
          >
            {(c) => (
              <>
                <DataCardHeader
                  title={<span className="font-mono text-xs">{c.creditNumber}</span>}
                  subtitle={`${c.supplier?.name ?? '—'} · ${c.creditType === 'return' ? t('From a return') : t('Manual')}`}
                  badge={c.status === 'void' && <Badge variant="danger">{t('Void')}</Badge>}
                />
                <DataCardFields>
                  <DataCardField label={t('Date')}>{formatDate(c.creditDate)}</DataCardField>
                  <DataCardField label={t('Amount')}>
                    <span className="font-medium">{formatMoney(c.amount, c.currencyCode)}</span>
                  </DataCardField>
                  <DataCardField label={t('Unallocated')}>{formatMoney(c.amountUnallocated, c.currencyCode)}</DataCardField>
                  {c.reason && (
                    <DataCardField label={t('Reason')} full>
                      {c.reason}
                    </DataCardField>
                  )}
                </DataCardFields>
                {canRecord &&
                  c.status === 'open' &&
                  (c.amountUnallocated > 0 || (c.creditType === 'manual' && c.amountAllocated === 0)) && (
                    <DataCardActions>
                      {c.amountUnallocated > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: 'allocate-credit', credit: c })}>
                          {t('Allocate')}
                        </Button>
                      )}
                      {c.creditType === 'manual' && c.amountAllocated === 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => voidDocument.mutate({ kind: 'credit', id: c.id })}
                        >
                          {t('Void')}
                        </Button>
                      )}
                    </DataCardActions>
                  )}
              </>
            )}
          </DataCards>
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Credit')}</Th>
                <Th>{t('Supplier')}</Th>
                <Th>{t('Date')}</Th>
                <Th>{t('Reason')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th className="text-right">{t('Unallocated')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {credits.isLoading ? (
                <EmptyRow colSpan={7}>{t('Loading...')}</EmptyRow>
              ) : (credits.data ?? []).length === 0 ? (
                <EmptyRow colSpan={7}>{t('No supplier credits yet.')}</EmptyRow>
              ) : (
                credits.data!.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-mono text-xs font-medium">
                      {c.creditNumber}
                      {c.status === 'void' && (
                        <Badge variant="danger" className="ml-1">
                          {t('Void')}
                        </Badge>
                      )}
                      <div className="font-sans text-xs text-gray-500">
                        {c.creditType === 'return' ? t('From a return') : t('Manual')}
                      </div>
                    </Td>
                    <Td>{c.supplier?.name ?? '—'}</Td>
                    <Td className="whitespace-nowrap">{formatDate(c.creditDate)}</Td>
                    <Td className="text-gray-600">{c.reason}</Td>
                    <Td className="text-right">{formatMoney(c.amount, c.currencyCode)}</Td>
                    <Td className="text-right">{formatMoney(c.amountUnallocated, c.currencyCode)}</Td>
                    <Td>
                      {canRecord && c.status === 'open' && (
                        <div className="flex justify-end gap-1">
                          {c.amountUnallocated > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDialog({
                                  kind: 'allocate-credit',
                                  credit: c,
                                })
                              }
                            >
                              {t('Allocate')}
                            </Button>
                          )}
                          {c.creditType === 'manual' && c.amountAllocated === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() =>
                                voidDocument.mutate({
                                  kind: 'credit',
                                  id: c.id,
                                })
                              }
                            >
                              {t('Void')}
                            </Button>
                          )}
                        </div>
                      )}
                    </Td>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        )}
      </Card>

      {dialog?.kind === 'payment' && (
        <PaymentFormDialog
          initialSupplierId={supplierId}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      )}
      {dialog?.kind === 'credit' && (
        <CreditFormDialog
          initialSupplierId={supplierId}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      )}
      {(dialog?.kind === 'allocate-payment' || dialog?.kind === 'allocate-credit') && (
        <AllocateDialog
          source={
            dialog.kind === 'allocate-payment'
              ? {
                  kind: 'payment',
                  id: dialog.payment.id,
                  number: dialog.payment.paymentNumber,
                  supplierId: dialog.payment.supplierId,
                  available: dialog.payment.amountUnallocated,
                  currency: dialog.payment.currencyCode,
                }
              : {
                  kind: 'credit',
                  id: dialog.credit.id,
                  number: dialog.credit.creditNumber,
                  supplierId: dialog.credit.supplierId,
                  available: dialog.credit.amountUnallocated,
                  currency: dialog.credit.currencyCode,
                }
          }
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 * Amounts to allocate per open invoice of a supplier; never more than each owes
 * nor, in total, more than `available`
 */
function AllocationEditor({
  supplierId,
  available,
  currency,
  value,
  onChange,
}: {
  supplierId: string;
  available: number;
  currency: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['payables', 'open-invoices', supplierId],
    queryFn: () => payablesApi.openInvoices(supplierId),
    enabled: !!supplierId,
  });
  const allocated = Object.values(value).reduce((sum, v) => sum + toCents(Number(v) || 0), 0);
  const smallScreen = useSmallScreen();

  const amountInput = (invoice: (typeof invoices)[number], className?: string) => (
    <Input
      inputMode="decimal"
      placeholder="0.00"
      value={value[invoice.id] ?? ''}
      onChange={(e) => onChange({ ...value, [invoice.id]: e.target.value })}
      className={className}
      aria-label={t('Amount for invoice {number}', {
        number: invoice.invoiceNumber,
      })}
    />
  );

  // Oldest due first, up to what is available
  const autofill = () => {
    let left = toCents(available);
    const next: Record<string, string> = {};
    for (const invoice of invoices) {
      if (left <= 0) break;
      const take = Math.min(left, toCents(invoice.amountOpen));
      next[invoice.id] = (take / 100).toFixed(2);
      left -= take;
    }
    onChange(next);
  };

  if (!supplierId) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('Allocate to invoices')}</span>
        <Button type="button" size="sm" variant="outline" onClick={autofill} disabled={invoices.length === 0 || available <= 0}>
          {t('Oldest first')}
        </Button>
      </div>
      {smallScreen ? (
        // Phones: one line per invoice with the amount box in view
        <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
          {isLoading ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">{t('Loading...')}</p>
          ) : invoices.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">
              {t('No approved invoice is waiting for payment. The amount stays on account.')}
            </p>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center gap-2 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="break-words font-mono text-xs font-medium">{invoice.invoiceNumber}</div>
                  <div className="text-xs text-gray-500">
                    {t('Due')} {formatDate(invoice.dueDate)} · {t('Owed')} {formatMoney(invoice.amountOpen, currency)}
                  </div>
                </div>
                {amountInput(invoice, 'h-10 w-28 shrink-0')}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="max-h-64 overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t('Invoice')}</th>
                <th className="px-3 py-2 font-medium">{t('Due')}</th>
                <th className="px-3 py-2 text-right font-medium">{t('Owed')}</th>
                <th className="w-32 px-3 py-2 font-medium">{t('Allocate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                    {t('Loading...')}
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                    {t('No approved invoice is waiting for payment. The amount stays on account.')}
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-3 py-2 font-mono text-xs">{invoice.invoiceNumber}</td>
                    <td className="px-3 py-2">{formatDate(invoice.dueDate)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(invoice.amountOpen, currency)}</td>
                    <td className="px-3 py-2">{amountInput(invoice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className={`text-xs ${allocated > toCents(available) ? 'text-red-600' : 'text-gray-500'}`}>
        {t('Allocated {allocated} of {available}; {left} stays on account.', {
          allocated: formatMoney(allocated / 100, currency),
          available: formatMoney(available, currency),
          left: formatMoney(Math.max(0, toCents(available) - allocated) / 100, currency),
        })}
      </p>
    </div>
  );
}

/** Allocation amounts → request lines, checked against the invoices and what is available */
function allocationsFrom(value: Record<string, string>, available: number): Allocation[] | string {
  const allocations: Allocation[] = [];
  let total = 0;
  for (const [invoiceId, raw] of Object.entries(value)) {
    if (!raw.trim()) continue;
    const amount = Number(raw);
    if (isNaN(amount) || amount < 0) return t('Allocated amounts must be positive.');
    if (amount === 0) continue;
    total += toCents(amount);
    allocations.push({ invoiceId, amount: Math.round(amount * 100) / 100 });
  }
  if (total > toCents(available)) return t('You cannot allocate more than the amount available.');
  return allocations;
}

function PaymentFormDialog({
  initialSupplierId,
  onClose,
  onSaved,
}: {
  initialSupplierId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const storeCurrency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<SupplierPaymentMethod>('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(today());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const currency = suppliers.find((s) => s.id === supplierId)?.currencyCode ?? storeCurrency;
  const value = Number(amount) || 0;

  const save = useMutation({
    mutationFn: supplierPaymentsApi.create,
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err, 'Could not record the payment')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError(t('Choose a supplier.'));
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) return setError(t('Enter the amount paid.'));
    if (paymentDate > today()) return setError(t('The date cannot be in the future'));
    const lines = allocationsFrom(allocations, value);
    if (typeof lines === 'string') return setError(lines);
    save.mutate({
      supplierId,
      amount: Math.round(value * 100) / 100,
      method,
      paymentDate,
      ...(reference.trim() && { reference: reference.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
      ...(lines.length && { allocations: lines }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('New supplier payment')}</DialogTitle>
          <DialogDescription>
            {t('Allocate it to approved invoices, fully or partly. What is not allocated stays on account.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Supplier')} htmlFor="pay-supplier">
              <Select
                id="pay-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setAllocations({});
                }}
              >
                <option value="">{t('Choose a supplier...')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Amount ({currency})', { currency })} htmlFor="pay-amount">
              <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field
              label={t('Date')}
              htmlFor="pay-date"
              error={paymentDate > today() ? t('The date cannot be in the future') : undefined}
            >
              <Input
                id="pay-date"
                type="date"
                max={today()}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </Field>
            <Field label={t('Method')} htmlFor="pay-method">
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as SupplierPaymentMethod)}>
                {Object.entries(paymentMethodLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {t(label)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Reference')} htmlFor="pay-reference" hint={t('Cheque or transfer number')}>
              <Input id="pay-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            <Field label={t('Notes')} htmlFor="pay-notes">
              <Input id="pay-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <AllocationEditor
            supplierId={supplierId}
            available={value}
            currency={currency}
            value={allocations}
            onChange={setAllocations}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Record payment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreditFormDialog({
  initialSupplierId,
  onClose,
  onSaved,
}: {
  initialSupplierId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const storeCurrency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [amount, setAmount] = useState('');
  const [creditDate, setCreditDate] = useState(today());
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currency = suppliers.find((s) => s.id === supplierId)?.currencyCode ?? storeCurrency;

  const save = useMutation({
    mutationFn: supplierCreditsApi.create,
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err, 'Could not record the credit')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError(t('Choose a supplier.'));
    const value = Number(amount);
    if (!amount.trim() || isNaN(value) || value <= 0) return setError(t('Enter the credit amount.'));
    if (!reason.trim()) return setError(t('A reason is required.'));
    if (creditDate > today()) return setError(t('The date cannot be in the future'));
    save.mutate({
      supplierId,
      amount: Math.round(value * 100) / 100,
      creditDate,
      reason: reason.trim(),
      ...(reference.trim() && { reference: reference.trim() }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('New supplier credit')}</DialogTitle>
          <DialogDescription>
            {t('A credit note from the supplier (returns create their own credit). It reduces what you owe.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Supplier')} htmlFor="credit-supplier">
              <Select id="credit-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t('Choose a supplier...')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Amount ({currency})', { currency })} htmlFor="credit-amount">
              <Input id="credit-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field
              label={t('Date')}
              htmlFor="credit-date"
              error={creditDate > today() ? t('The date cannot be in the future') : undefined}
            >
              <Input
                id="credit-date"
                type="date"
                max={today()}
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
              />
            </Field>
            <Field label={t('Credit note number')} htmlFor="credit-reference">
              <Input id="credit-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
          <Field label={t('Reason')} htmlFor="credit-reason">
            <Input id="credit-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Record credit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AllocateDialog({
  source,
  onClose,
  onSaved,
}: {
  source: {
    kind: 'payment' | 'credit';
    id: string;
    number: string;
    supplierId: string;
    available: number;
    currency: string;
  };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (lines: Allocation[]): Promise<unknown> =>
      source.kind === 'payment'
        ? supplierPaymentsApi.allocate(source.id, lines)
        : supplierCreditsApi.allocate(source.id, lines),
    onSuccess: onSaved,
    onError: (err) => setError(getErrorMessage(err, 'Could not allocate')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const lines = allocationsFrom(allocations, source.available);
    if (typeof lines === 'string') return setError(lines);
    if (lines.length === 0) return setError(t('Enter an amount for at least one invoice.'));
    save.mutate(lines);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Allocate {number}', { number: source.number })}</DialogTitle>
          <DialogDescription>
            {t('{amount} is not allocated yet.', { amount: formatMoney(source.available, source.currency) })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <AllocationEditor
            supplierId={source.supplierId}
            available={source.available}
            currency={source.currency}
            value={allocations}
            onChange={setAllocations}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Allocate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
