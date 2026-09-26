'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { posApi } from '@/lib/api/sales';
import { ExchangeLink, exchangesApi } from '@/lib/api/returns';
import { paymentMethodsApi, registersApi } from '@/lib/api/settings';
import { ONLINE_ONLY_TENDERS } from '@/lib/api/stored-value';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatDateTime, formatMoney } from '@/lib/format';
import { usePOSStore } from '@/stores/pos-store';
import { t } from '@/i18n';

export interface ExchangeLine {
  variantId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

/** Estimated value of the replacement items (the server prices them exactly) */
export const exchangeEstimate = (lines: ExchangeLine[]) =>
  Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity * 100, 0)) / 100;

/**
 * Pick the replacement items of an exchange from the catalog of a register
 */
export function ExchangeItemsPicker({
  registerId,
  currency,
  lines,
  onChange,
}: {
  registerId: string;
  currency: string;
  lines: ExchangeLine[];
  onChange: (lines: ExchangeLine[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['exchange-catalog', registerId, debounced],
    queryFn: () => posApi.catalog({ registerId, search: debounced, limit: 10 }),
    enabled: !!registerId && debounced.length >= 2,
  });

  const add = (item: (typeof results)[number]) => {
    const existing = lines.find((l) => l.variantId === item.variantId);
    if (existing) {
      onChange(lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      onChange([
        ...lines,
        {
          variantId: item.variantId,
          name: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`,
          sku: item.sku,
          price: item.price,
          quantity: 1,
        },
      ]);
    }
    setSearch('');
  };

  const setQuantity = (variantId: string, quantity: number) =>
    onChange(
      quantity <= 0
        ? lines.filter((l) => l.variantId !== variantId)
        : lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l))
    );

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search the replacement item by name, SKU or barcode...')}
          aria-label={t('Search the replacement item')}
          className="pl-10"
        />
        {debounced.length >= 2 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow">
            {isFetching && results.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">{t('Searching...')}</p>
            ) : results.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">{t('No products match your search')}</p>
            ) : (
              results.map((item) => (
                <button
                  key={item.variantId}
                  type="button"
                  onClick={() => add(item)}
                  className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span>
                    {item.productName}
                    {item.variantName && <span className="text-gray-500"> · {item.variantName}</span>}
                    <span className="block font-mono text-xs text-gray-400">{item.sku}</span>
                  </span>
                  <span>{formatMoney(item.price, currency)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-gray-500">{t('No replacement items yet.')}</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {lines.map((line) => (
            <li key={line.variantId} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate">
                {line.name} <span className="font-mono text-xs text-gray-400">{line.sku}</span>
              </span>
              <span className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                  aria-label={t('Decrease quantity of {product}', { product: line.name })}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center">{line.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                  aria-label={t('Increase quantity of {product}', { product: line.name })}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <span className="w-24 text-right">{formatMoney(line.price * line.quantity, currency)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(line.variantId, 0)}
                  aria-label={t('Remove {product}', { product: line.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// How exchange credit is refunded: '' = the sale's original payments, store credit, or a method id
const STORE_CREDIT_CHOICE = 'store_credit';
const refundChoice = (choice: string) =>
  choice === STORE_CREDIT_CHOICE
    ? { refundToStoreCredit: true }
    : choice
      ? { refundMethodId: choice }
      : {};

function CreditRefundSelect({
  id,
  value,
  onChange,
  methods,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  methods: { id: string; code: string; name: Record<string, string> | null }[];
}) {
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('Original payment')}</option>
      <option value={STORE_CREDIT_CHOICE}>{t('Store credit')}</option>
      {methods.map((m) => (
        <option key={m.id} value={m.id}>
          {text(m.name, m.code)}
        </option>
      ))}
    </Select>
  );
}

/**
 * Exchanges whose replacement sale failed: the return stands and the customer is
 * still owed the replacement. "Complete" rings it up again; "Cancel and refund"
 * gives up the exchange and refunds its credit.
 */
export function IncompleteExchanges() {
  const [completing, setCompleting] = useState<ExchangeLink | null>(null);
  const [cancelling, setCancelling] = useState<ExchangeLink | null>(null);
  const { data } = useQuery({
    queryKey: ['exchanges', 'incomplete'],
    queryFn: () => exchangesApi.list({ status: 'incomplete', limit: 50 }),
  });
  const rows = data?.data ?? [];
  if (rows.length === 0) return null;
  return (
    <Card className="border-amber-300 bg-amber-50 p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        {t('Incomplete exchanges')}
      </h2>
      <ul className="divide-y divide-amber-200 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              <span className="font-mono">{row.saleReturn?.returnNumber ?? row.returnId}</span> ·{' '}
              {formatDateTime(row.createdAt)} ·{' '}
              {t('credit {amount}', {
                amount: formatMoney(row.creditAmount, row.saleReturn?.currencyCode ?? 'USD'),
              })}
              {row.failureReason && <span className="block text-xs text-amber-800">{row.failureReason}</span>}
            </span>
            <span className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCancelling(row)}>
                {t('Cancel and refund')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setCompleting(row)}>
                {t('Complete')}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <CompleteExchangeDialog exchange={completing} onClose={() => setCompleting(null)} />
      <CancelExchangeDialog exchange={cancelling} onClose={() => setCancelling(null)} />
    </Card>
  );
}

function CompleteExchangeDialog({ exchange, onClose }: { exchange: ExchangeLink | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const posRegisterId = usePOSStore((state) => state.registerId);
  const [lines, setLines] = useState<ExchangeLine[]>([]);
  const [registerId, setRegisterId] = useState('');
  const [methodId, setMethodId] = useState('');
  // Replacement worth less than the credit: where the rest goes
  const [creditRefund, setCreditRefund] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: registers = [] } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
    enabled: !!exchange,
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: !!exchange,
  });
  const activeRegisters = registers.filter((r) => r.status === 'active');
  const register = registerId || (activeRegisters.find((r) => r.id === posRegisterId) ?? activeRegisters[0])?.id || '';
  const moneyMethods = methods.filter((m) => m.status === 'active' && !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY');
  const method = methodId || moneyMethods.find((m) => m.methodType === 'cash')?.id || moneyMethods[0]?.id || '';
  const currency = exchange?.saleReturn?.currencyCode ?? 'USD';
  const creditLeft = exchange ? Math.round((exchange.creditAmount - exchangeEstimate(lines)) * 100) / 100 : 0;

  const close = () => {
    setLines([]);
    setCreditRefund('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!exchange) return;
    setBusy(true);
    setError(null);
    try {
      const result = await withApproval((headers) =>
        exchangesApi.complete(
          exchange.id,
          {
            registerId: register,
            newSale: {
              items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
              payments: [],
              differenceMethodId: method || undefined,
              ...(creditRefund === STORE_CREDIT_CHOICE
                ? { creditToStoreCredit: true }
                : creditRefund
                  ? { creditRefundMethodId: creditRefund }
                  : {}),
            },
          },
          headers
        )
      );
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      if (result.exchange.status === 'completed') close();
      else setError(result.error ?? t('The replacement sale failed'));
    } catch (err) {
      setError(getErrorMessage(err, 'The replacement sale failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={!!exchange} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Complete the exchange')}</DialogTitle>
            <DialogDescription>
              {exchange &&
                t('Choose the replacement items. The {amount} credit from the return pays for them first.', {
                  amount: formatMoney(exchange.creditAmount, currency),
                })}
            </DialogDescription>
          </DialogHeader>
          <ErrorMessage>{error}</ErrorMessage>
          <ExchangeItemsPicker registerId={register} currency={currency} lines={lines} onChange={setLines} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Register')} htmlFor="exchange-register">
              <Select id="exchange-register" value={register} onChange={(e) => setRegisterId(e.target.value)}>
                {activeRegisters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            {lines.length > 0 && creditLeft > 0 ? (
              <Field
                label={t('Refund the rest of the credit ({amount}) to', { amount: formatMoney(creditLeft, currency) })}
                htmlFor="exchange-credit-refund"
                hint={t("Another tender than the sale's may need a manager's approval.")}
              >
                <CreditRefundSelect
                  id="exchange-credit-refund"
                  value={creditRefund}
                  onChange={setCreditRefund}
                  methods={moneyMethods}
                />
              </Field>
            ) : (
              <Field label={t('The customer pays the difference with')} htmlFor="exchange-method">
                <Select id="exchange-method" value={method} onChange={(e) => setMethodId(e.target.value)}>
                  {moneyMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {text(m.name, m.code)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              {t('Cancel')}
            </Button>
            <Button onClick={submit} disabled={busy || lines.length === 0 || !register}>
              {busy ? t('Processing...') : t('Complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}

/** Give up an incomplete exchange: its credit is refunded (original payment by default) */
function CancelExchangeDialog({ exchange, onClose }: { exchange: ExchangeLink | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();
  const posRegisterId = usePOSStore((state) => state.registerId);
  const [registerId, setRegisterId] = useState('');
  const [choice, setChoice] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: registers = [] } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
    enabled: !!exchange,
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: !!exchange,
  });
  const activeRegisters = registers.filter((r) => r.status === 'active');
  const register = registerId || (activeRegisters.find((r) => r.id === posRegisterId) ?? activeRegisters[0])?.id || '';
  const moneyMethods = methods.filter((m) => m.status === 'active' && !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY');
  const currency = exchange?.saleReturn?.currencyCode ?? 'USD';

  const close = () => {
    setChoice('');
    setReason('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    if (!exchange) return;
    if (!reason.trim()) {
      setError(t('Enter a reason'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await withApproval((headers) =>
        exchangesApi.cancel(exchange.id, { registerId: register, reason: reason.trim(), ...refundChoice(choice) }, headers)
      );
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      close();
    } catch (err) {
      setError(getErrorMessage(err, 'The exchange could not be cancelled'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={!!exchange} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Cancel the exchange')}</DialogTitle>
            <DialogDescription>
              {exchange &&
                t('No replacement is rung up: the {amount} credit from the return is refunded to the customer.', {
                  amount: formatMoney(exchange.creditAmount, currency),
                })}
            </DialogDescription>
          </DialogHeader>
          <ErrorMessage>{error}</ErrorMessage>
          <div className="space-y-4">
            <Field label={t('Register')} htmlFor="cancel-exchange-register">
              <Select id="cancel-exchange-register" value={register} onChange={(e) => setRegisterId(e.target.value)}>
                {activeRegisters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('Refund to')}
              htmlFor="cancel-exchange-refund"
              hint={t("Another tender than the sale's may need a manager's approval.")}
            >
              <CreditRefundSelect id="cancel-exchange-refund" value={choice} onChange={setChoice} methods={moneyMethods} />
            </Field>
            <Field label={t('Reason')} htmlFor="cancel-exchange-reason">
              <Textarea id="cancel-exchange-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              {t('Back')}
            </Button>
            <Button onClick={submit} disabled={busy || !register}>
              {busy ? t('Processing...') : t('Cancel and refund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
