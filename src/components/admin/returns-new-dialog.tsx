'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Printer, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { ReturnReceipt } from '@/components/admin/returns-receipt';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { useApproval } from '@/components/approval-dialog';
import {
  exchangesApi,
  ExchangeResult,
  returnsApi,
  CreateReturnInput,
  ReturnDisposition,
  SaleLookup,
  SaleReturn,
} from '@/lib/api/returns';
import { ONLINE_ONLY_TENDERS } from '@/lib/api/stored-value';
import { ExchangeItemsPicker, ExchangeLine, exchangeEstimate } from '@/components/admin/returns-exchange';
import { APPROVAL_HEADER, approvablePermission } from '@/lib/api/approvals';
import { paymentMethodsApi, registersApi } from '@/lib/api/settings';
import { customerName } from '@/lib/api/customers';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { usePOSStore } from '@/stores/pos-store';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t } from '@/i18n';
import { formatQuantity, itemCount, lineUnit, roundToUnit } from '@/lib/pos/quantity';
import type { CatalogUnit } from '@/lib/pos/quantity';
import { randomId } from '@/lib/uuid';
import { useSmallScreen } from '@/components/ui/data-cards';

// Refund option: the customer's store credit (instead of a payment method)
const STORE_CREDIT_REFUND = '__store_credit__';

type Mode = 'return' | 'exchange' | 'goodwill';

interface LineChoice {
  quantity: number;
  disposition: ReturnDisposition;
}

/**
 * Guided return: find the sale → choose items and quantities → choose the refund → done.
 * Also an exchange (items back + a replacement sale, the difference paid or refunded)
 * and a goodwill refund (money back without goods).
 */
type LookupLine = SaleLookup['lines'][number];

// Name, variant / SKU and refund per unit of a sold line
function ReturnLineLabel({
  line,
  unit,
  money,
}: {
  line: LookupLine;
  unit: CatalogUnit | null;
  money: (value: number) => string;
}) {
  return (
    <div>
      <div className="font-medium">{line.productName}</div>
      <div className="text-xs text-gray-500">
        {[line.variantName, line.sku].filter(Boolean).join(' · ')} ·{' '}
        {unit?.code
          ? t('{price}/{unit}', { price: money(line.refundPerUnit), unit: unit.code })
          : t('{amount} each', { amount: money(line.refundPerUnit) })}
      </div>
    </div>
  );
}

export function NewReturnDialog({
  open,
  onOpenChange,
  initialSaleNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSaleNumber?: string;
}) {
  const queryClient = useQueryClient();
  const { data: settings } = useStoreSettings();
  // The credit note print is recorded (original, then COPY)
  const creditNotePrinter = usePrintDocument();
  const { withApproval, approvalDialog } = useApproval();
  const posRegisterId = usePOSStore((state) => state.registerId);
  const user = useAuthStore((state) => state.user);

  const [saleNumber, setSaleNumber] = useState(initialSaleNumber ?? '');
  const [lookup, setLookup] = useState<SaleLookup | null>(null);
  const [choices, setChoices] = useState<Record<string, LineChoice>>({});
  const [reason, setReason] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [refundMode, setRefundMode] = useState<'original' | string>('original');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState<SaleReturn | null>(null);
  const [mode, setMode] = useState<Mode>('return');
  const [goodwillAmount, setGoodwillAmount] = useState('');
  const [exchangeLines, setExchangeLines] = useState<ExchangeLine[]>([]);
  const [differenceMethodId, setDifferenceMethodId] = useState('');
  const [exchangeResult, setExchangeResult] = useState<ExchangeResult | null>(null);
  // One key per return attempt, so a retry after a network error can't refund twice
  const idempotencyKey = useRef<string>(randomId());
  // Manager approvals given for this return; one return can need several (refund
  // permission, return window, refunding to another payment method)
  const approvalTokens = useRef<string[]>([]);

  const { data: registers = [] } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
    enabled: open,
  });
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: open,
  });
  const activeRegisters = registers.filter((r) => r.status === 'active');
  const effectiveRegisterId =
    registerId || (activeRegisters.find((r) => r.id === posRegisterId) ?? activeRegisters[0])?.id || '';

  const reset = () => {
    setSaleNumber(initialSaleNumber ?? '');
    setLookup(null);
    setChoices({});
    setReason('');
    setRefundMode('original');
    setError(null);
    setCompleted(null);
    setMode('return');
    setGoodwillAmount('');
    setExchangeLines([]);
    setDifferenceMethodId('');
    setExchangeResult(null);
    idempotencyKey.current = randomId();
    approvalTokens.current = [];
  };

  const close = () => {
    if (busy) return;
    reset();
    onOpenChange(false);
  };

  const find = async () => {
    if (!saleNumber.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await withApproval((headers) => {
        // A refund approval given here also covers the return itself
        const token = headers?.[APPROVAL_HEADER];
        if (token && !approvalTokens.current.includes(token)) approvalTokens.current.push(token);
        return returnsApi.lookup(saleNumber.trim(), headers);
      });
      setLookup(result);
      setChoices(
        Object.fromEntries(result.lines.map((line) => [line.saleItemId, { quantity: 0, disposition: 'restock' }]))
      );
    } catch (err) {
      setLookup(null);
      setError(getErrorMessage(err, 'Sale not found'));
    } finally {
      setBusy(false);
    }
  };

  const selected = useMemo(
    () => (lookup?.lines ?? []).filter((line) => (choices[line.saleItemId]?.quantity ?? 0) > 0),
    [lookup, choices]
  );
  // Estimate for display; the server computes the exact split of discounts and tax
  const estimate = selected.reduce((sum, line) => sum + line.refundPerUnit * choices[line.saleItemId].quantity, 0);
  const currency = lookup?.sale.currencyCode ?? settings?.currencyCode ?? 'USD';
  const money = (value: number) => formatMoney(value, currency);
  // Refunding to a method the sale wasn't paid with needs sales.refund.any_method (or
  // approval); store credit keeps the money in the store and needs none
  const otherTender =
    refundMode !== 'original' &&
    refundMode !== STORE_CREDIT_REFUND &&
    !(lookup?.sale.payments ?? []).some((p) => p.paymentMethodId === refundMode);
  // Tenders a refund or a difference can be paid with (not account / stored value / exchange credit)
  const moneyMethods = methods.filter((m) => m.status === 'active' && !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY');
  const goodwillValue = Math.round((Number(goodwillAmount) || 0) * 100) / 100;
  const newItemsEstimate = exchangeEstimate(exchangeLines);
  // + the customer pays, − the customer gets back (estimates; the server prices exactly)
  const difference = Math.round((newItemsEstimate - estimate) * 100) / 100;
  const differenceMethod = differenceMethodId || moneyMethods.find((m) => m.methodType === 'cash')?.id || moneyMethods[0]?.id || '';

  const smallScreen = useSmallScreen();

  const setChoice = (saleItemId: string, patch: Partial<LineChoice>) =>
    setChoices((current) => ({ ...current, [saleItemId]: { ...current[saleItemId], ...patch } }));

  // How many of a sold line come back (by the kg / m / l for weighed lines)
  const quantityInput = (line: LookupLine, choice: LineChoice | undefined, unit: CatalogUnit | null, className: string) => (
    <Input
      type="number"
      inputMode={unit?.precision ? 'decimal' : 'numeric'}
      min={0}
      max={line.quantityReturnable}
      step={unit?.precision ? 1 / 10 ** unit.precision : 1}
      value={choice?.quantity ?? 0}
      disabled={line.quantityReturnable === 0 || !lookup?.returnable}
      onChange={(e) =>
        setChoice(line.saleItemId, {
          quantity: Math.max(0, Math.min(Number(line.quantityReturnable), roundToUnit(Number(e.target.value) || 0, unit))),
        })
      }
      className={className}
      aria-label={t('Quantity of {name} to return', { name: line.productName })}
    />
  );

  const conditionSelect = (line: LookupLine, choice: LineChoice | undefined, className: string) => (
    <Select
      value={choice?.disposition ?? 'restock'}
      disabled={!choice?.quantity}
      onChange={(e) => setChoice(line.saleItemId, { disposition: e.target.value as ReturnDisposition })}
      className={className}
      aria-label={t('Condition of {name}', { name: line.productName })}
    >
      <option value="restock">{t('Back to stock')}</option>
      <option value="damaged">{t('Damaged — keep in quarantine')}</option>
      <option value="dispose">{t('Damaged — dispose')}</option>
    </Select>
  );

  // Every approval collected so far goes with the request (comma-separated); withApproval
  // asks for one approval, so ask again while the server wants another one
  const withApprovals = async <T,>(call: (headers?: Record<string, string>) => Promise<T>): Promise<T> => {
    const send = (headers?: Record<string, string>) => {
      const token = headers?.[APPROVAL_HEADER];
      if (token && !approvalTokens.current.includes(token)) approvalTokens.current.push(token);
      const tokens = approvalTokens.current;
      return call(tokens.length ? { [APPROVAL_HEADER]: tokens.join(',') } : undefined);
    };
    for (let attempt = 0; ; attempt++) {
      const approvalsBefore = approvalTokens.current.length;
      try {
        return await withApproval(send);
      } catch (err) {
        const approvedOne = approvalTokens.current.length > approvalsBefore;
        if (attempt < 3 && approvedOne && approvablePermission(err)) continue;
        throw err;
      }
    }
  };

  const submit = async () => {
    if (!lookup) return;
    setBusy(true);
    setError(null);
    const items = mode === 'goodwill'
      ? []
      : selected.map((line) => ({
          saleItemId: line.saleItemId,
          quantity: choices[line.saleItemId].quantity,
          disposition: choices[line.saleItemId].disposition,
        }));
    const refund = {
      // One chosen method refunds the exact total the server calculates
      refundMethodId: refundMode === 'original' || refundMode === STORE_CREDIT_REFUND ? undefined : refundMode,
      refundToStoreCredit: refundMode === STORE_CREDIT_REFUND || undefined,
    };
    try {
      if (mode === 'exchange') {
        const result = await withApprovals((headers) =>
          exchangesApi.create(
            {
              saleId: lookup.sale.id,
              registerId: effectiveRegisterId,
              reason: reason.trim(),
              items,
              ...refund,
              newSale: {
                items: exchangeLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
                payments: [],
                differenceMethodId: differenceMethod || undefined,
              },
              idempotencyKey: idempotencyKey.current,
            },
            headers
          )
        );
        setExchangeResult(result);
        setCompleted(result.saleReturn);
      } else {
        const input: CreateReturnInput = {
          saleId: lookup.sale.id,
          registerId: effectiveRegisterId,
          reason: reason.trim(),
          idempotencyKey: idempotencyKey.current,
          items,
          ...refund,
          ...(mode === 'goodwill' ? { type: 'goodwill' as const, goodwillAmount: goodwillValue } : {}),
        };
        setCompleted(await withApprovals((headers) => returnsApi.create(input, headers)));
      }
      queryClient.invalidateQueries({ queryKey: ['returns'] });
      queryClient.invalidateQueries({ queryKey: ['exchanges'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    } catch (err) {
      setError(getErrorMessage(err, 'The return could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !!lookup &&
    lookup.returnable &&
    reason.trim().length > 0 &&
    !!effectiveRegisterId &&
    !busy &&
    (mode === 'goodwill'
      ? goodwillValue > 0
      : selected.length > 0 && (mode === 'return' || exchangeLines.length > 0));
  const submitLabel = busy
    ? t('Processing...')
    : mode === 'goodwill'
      ? t('Refund {amount}', { amount: money(goodwillValue) })
      : mode === 'exchange'
        ? t('Exchange')
        : t('Refund {amount}', { amount: money(estimate) });
  const MODES: [Mode, string][] = [
    ['return', t('Return')],
    ['exchange', t('Exchange')],
    ['goodwill', t('Goodwill refund')],
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {completed
                ? exchangeResult
                  ? t('Exchange recorded')
                  : t('Return complete')
                : mode === 'exchange'
                  ? t('New exchange')
                  : mode === 'goodwill'
                    ? t('Goodwill refund')
                    : t('New return')}
            </DialogTitle>
            <DialogDescription>
              {completed
                ? t('Give the customer their refund and a copy of this receipt.')
                : t('Find the original sale by its receipt number, then choose what comes back.')}
            </DialogDescription>
          </DialogHeader>

          {completed ? (
            <>
              {exchangeResult &&
                (exchangeResult.exchange.status === 'completed' ? (
                  <p className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t('Exchange complete: new sale {number}', { number: exchangeResult.sale?.saleNumber ?? '' })}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t('The return is recorded but the replacement sale failed: {error}. Complete the exchange from the returns list.', {
                      error: exchangeResult.error ?? '',
                    })}
                  </p>
                ))}
              {completed.status !== 'completed' && (
                <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {completed.status === 'refund_failed'
                    ? t('A card refund failed. Retry it from the returns list, or refund another way.')
                    : t('A card refund is still being processed by the payment provider.')}
                </p>
              )}
              <div className="max-h-[55vh] overflow-y-auto rounded-md border p-4">
                <ReturnReceipt saleReturn={completed} settings={settings} copy={creditNotePrinter.copy} />
              </div>
              {creditNotePrinter.error && <p className="text-sm text-red-600">{creditNotePrinter.error}</p>}
              <DialogFooter>
                <Button variant="outline" onClick={() => creditNotePrinter.print('credit_note', completed.id)}>
                  <Printer className="h-4 w-4" />
                  {t('Print credit note')}
                </Button>
                <Button onClick={close}>{t('Done')}</Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4">
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  find();
                }}
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    autoFocus
                    value={saleNumber}
                    onChange={(e) => setSaleNumber(e.target.value)}
                    placeholder={t('Receipt number, e.g. S-000123 (or scan it)')}
                    className="pl-10 font-mono"
                    aria-label={t('Receipt number')}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={busy || !saleNumber.trim()}>
                  {t('Find sale')}
                </Button>
              </form>

              <ErrorMessage>{error}</ErrorMessage>

              {lookup && (
                <>
                  <div className="rounded-md bg-gray-50 p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">
                        {lookup.sale.saleNumber} · {formatDateTime(lookup.sale.saleDate)}
                      </span>
                      <span>{t('Total {amount}', { amount: money(lookup.sale.total) })}</span>
                    </div>
                    <div className="text-gray-600">
                      {lookup.sale.customer ? customerName(lookup.sale.customer) : t('Walk-in customer')} ·{' '}
                      {t('paid with {methods}', {
                        methods: (lookup.sale.payments ?? [])
                          .map((p) => text(p.paymentMethod?.name, t('payment')))
                          .join(' + '),
                      })}
                    </div>
                    {!lookup.returnable && (
                      <p className="mt-2 font-medium text-red-600">
                        {t("This sale is {status} and can't be returned.", { status: t(lookup.sale.status) })}
                      </p>
                    )}
                    {lookup.outsideReturnWindow && lookup.returnable && (
                      <p className="mt-2 flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" />
                        {t('Older than the {days}-day return window — a manager will need to approve.', {
                          days: lookup.returnWindowDays,
                        })}
                      </p>
                    )}
                  </div>

                  {lookup.returnable && (
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1" role="radiogroup" aria-label={t('What to do')}>
                      {MODES.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={mode === value}
                          onClick={() => setMode(value)}
                          className={
                            mode === value
                              ? 'flex-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 shadow-sm'
                              : 'flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900'
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {mode === 'goodwill' ? (
                    <Field
                      label={t('Amount to refund (no goods come back)')}
                      htmlFor="goodwill-amount"
                      hint={
                        hasPermission(user, 'sales.refund.goodwill')
                          ? undefined
                          : t('A manager will need to approve a goodwill refund.')
                      }
                    >
                      <Input
                        id="goodwill-amount"
                        inputMode="decimal"
                        value={goodwillAmount}
                        onChange={(e) => setGoodwillAmount(e.target.value)}
                        className="w-40"
                      />
                    </Field>
                  ) : (
                  smallScreen ? (
                  // Phones: one card per sold item, the quantity box in view (a
                  // table would push it off-screen)
                  <div className="space-y-2">
                    {lookup.lines.length === 0 && (
                      <p className="rounded-md border p-3 text-sm text-gray-500">{t('No items.')}</p>
                    )}
                    {lookup.lines.map((line) => {
                      const choice = choices[line.saleItemId];
                      const unit = lineUnit(line);
                      return (
                        <div
                          key={line.saleItemId}
                          className={`space-y-2 rounded-md border p-3 ${line.quantityReturnable === 0 ? 'opacity-50' : ''}`}
                        >
                          <ReturnLineLabel line={line} unit={unit} money={money} />
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>
                              {t('Sold')}: {formatQuantity(Number(line.quantitySold), unit)}
                            </span>
                            <span>
                              {t('Returned')}: {formatQuantity(Number(line.quantityReturned), unit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{t('Return now')}</span>
                            {quantityInput(line, choice, unit, 'h-10 w-24 text-right')}
                            <span className="ml-auto text-sm font-medium">
                              {choice?.quantity ? money(line.refundPerUnit * choice.quantity) : '—'}
                            </span>
                          </div>
                          {conditionSelect(line, choice, 'h-10 w-full')}
                        </div>
                      );
                    })}
                  </div>
                  ) : (
                  <div className="rounded-md border">
                    <Table>
                      <THead>
                        <tr>
                          <Th>{t('Item')}</Th>
                          <Th className="text-right">{t('Sold')}</Th>
                          <Th className="text-right">{t('Returned')}</Th>
                          <Th className="text-right">{t('Return now')}</Th>
                          <Th>{t('Condition')}</Th>
                          <Th className="text-right">{t('Refund')}</Th>
                        </tr>
                      </THead>
                      <TBody>
                        {lookup.lines.length === 0 && <EmptyRow colSpan={6}>{t('No items.')}</EmptyRow>}
                        {lookup.lines.map((line) => {
                          const choice = choices[line.saleItemId];
                          // Weighed lines return by the kg / m / l, to the unit's precision
                          const unit = lineUnit(line);
                          return (
                            <tr key={line.saleItemId} className={line.quantityReturnable === 0 ? 'opacity-50' : ''}>
                              <Td>
                                <ReturnLineLabel line={line} unit={unit} money={money} />
                              </Td>
                              <Td className="text-right">{formatQuantity(Number(line.quantitySold), unit)}</Td>
                              <Td className="text-right">{formatQuantity(Number(line.quantityReturned), unit)}</Td>
                              <Td className="text-right">{quantityInput(line, choice, unit, 'ml-auto h-8 w-20 text-right')}</Td>
                              <Td>{conditionSelect(line, choice, 'h-8')}</Td>
                              <Td className="text-right">
                                {choice?.quantity ? money(line.refundPerUnit * choice.quantity) : '—'}
                              </Td>
                            </tr>
                          );
                        })}
                      </TBody>
                    </Table>
                  </div>
                  )
                  )}

                  {mode === 'exchange' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">{t('Replacement items')}</h3>
                      <ExchangeItemsPicker
                        registerId={effectiveRegisterId}
                        currency={currency}
                        lines={exchangeLines}
                        onChange={setExchangeLines}
                      />
                      {difference > 0 && (
                        <Field
                          label={t('The customer pays the difference with')}
                          htmlFor="difference-method"
                          hint={t('The exact amount is worked out when the exchange is recorded.')}
                        >
                          <Select
                            id="difference-method"
                            value={differenceMethod}
                            onChange={(e) => setDifferenceMethodId(e.target.value)}
                          >
                            {moneyMethods.map((m) => (
                              <option key={m.id} value={m.id}>
                                {text(m.name, m.code)}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Reason for the return')} htmlFor="return-reason">
                      <Textarea
                        id="return-reason"
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t('e.g. Wrong size, faulty, changed mind')}
                      />
                    </Field>
                    <div className="space-y-4">
                      <Field
                        label={t('Refund to')}
                        htmlFor="refund-mode"
                        hint={
                          otherTender && !hasPermission(user, 'sales.refund.any_method')
                            ? t("This sale wasn't paid this way: a manager will need to approve.")
                            : undefined
                        }
                      >
                        <Select id="refund-mode" value={refundMode} onChange={(e) => setRefundMode(e.target.value)}>
                          <option value="original">{t('Original payment (card first, then cash)')}</option>
                          {lookup.sale.customerId && (
                            <option value={STORE_CREDIT_REFUND}>{t("Customer's store credit")}</option>
                          )}
                          {moneyMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {text(m.name, m.code)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label={t('Register')}
                        htmlFor="return-register"
                        hint={t("Cash refunds come out of this register's open shift")}
                      >
                        <Select id="return-register" value={effectiveRegisterId} onChange={(e) => setRegisterId(e.target.value)}>
                          {activeRegisters.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>

                  {mode === 'exchange' ? (
                    <div className="flex items-center justify-between rounded-md bg-blue-50 p-3">
                      <span className="text-sm text-blue-800">
                        {difference > 0
                          ? t('Returned {returned} · new items {items} · customer pays about', {
                              returned: money(estimate),
                              items: money(newItemsEstimate),
                            })
                          : t('Returned {returned} · new items {items} · refund about', {
                              returned: money(estimate),
                              items: money(newItemsEstimate),
                            })}
                      </span>
                      <span className="text-lg font-semibold text-blue-900">{money(Math.abs(difference))}</span>
                    </div>
                  ) : mode === 'return' ? (
                    <div className="flex items-center justify-between rounded-md bg-blue-50 p-3">
                      <span className="text-sm text-blue-800">
                        {t('{count} item(s) · refund about', {
                          // Pieces by quantity, each weighed line once
                          count: itemCount(
                            selected.map((l) => ({ quantity: choices[l.saleItemId].quantity, unit: lineUnit(l) }))
                          ),
                        })}
                      </span>
                      <span className="text-lg font-semibold text-blue-900">{money(estimate)}</span>
                    </div>
                  ) : null}
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={close} disabled={busy}>
                  {t('Cancel')}
                </Button>
                <Button onClick={submit} disabled={!canSubmit}>
                  {submitLabel}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
