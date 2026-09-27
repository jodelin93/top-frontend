'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { DataCardField, DataCardFields, useSmallScreen } from '@/components/ui/data-cards';
import { useApproval } from '@/components/approval-dialog';
import {
  AGING_COLUMNS,
  CreditEntry,
  customerAccountsApi,
  Statement,
} from '@/lib/api/customer-accounts';
import { ONLINE_ONLY_TENDERS, storedValueApi } from '@/lib/api/stored-value';
import { paymentMethodsApi, registersApi } from '@/lib/api/settings';
import { customerName } from '@/lib/api/customers';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatDate, formatDateTime, formatMoney, todayLocalIso } from '@/lib/format';
import { useCurrency, useStoreSettings } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { translateServerNote } from '@/lib/server-texts';

// English labels, translated at render
export const ENTRY_LABELS: Record<CreditEntry['type'], string> = {
  charge: 'Sale on account',
  payment: 'Payment',
  credit_note: 'Credit note',
  adjustment: 'Adjustment',
  opening_balance: 'Opening balance',
  reversal: 'Reversal',
};

const today = () => todayLocalIso();
const monthStart = () => `${today().slice(0, 8)}01`;

/**
 * The customer's account (D019): balance, credit limit, terms and aging, the
 * ledger, a printable statement, taking a payment and manual adjustments
 */
export function CustomerAccountPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const user = useAuthStore((state) => state.user);
  const canReceive = hasPermission(user, 'customers.credit.receive');
  const canManage = hasPermission(user, 'customers.credit.manage');
  const money = (value: number) => formatMoney(value, currency);
  const { withApproval, approvalDialog } = useApproval();
  const smallScreen = useSmallScreen();

  const { data: account, error } = useQuery({
    queryKey: ['customer-account', customerId],
    queryFn: () => customerAccountsApi.account(customerId),
  });
  const { data: entries } = useQuery({
    queryKey: ['customer-account', customerId, 'entries'],
    queryFn: () => customerAccountsApi.entries(customerId, { limit: 50 }),
  });
  const { data: storeCredit } = useQuery({
    queryKey: ['store-credit', customerId],
    queryFn: () => storedValueApi.storeCredit(customerId),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-account', customerId] });
    queryClient.invalidateQueries({ queryKey: ['store-credit', customerId] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customer-accounts'] });
  };

  // ---- Receive a payment ----
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethodId, setPayMethodId] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payRegisterId, setPayRegisterId] = useState('');
  const payKey = useRef(newIdempotencyKey());
  const { data: methods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: paying,
  });
  const { data: registers = [] } = useQuery({
    queryKey: ['registers'],
    queryFn: () => registersApi.list(),
    enabled: paying,
  });
  const payMethods = methods.filter(
    (m) => m.status === 'active' && !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY'
  );
  const payMethod = payMethods.find((m) => m.id === payMethodId) ?? payMethods[0];
  const activeRegisters = registers.filter((r) => r.status === 'active');
  const register = payRegisterId || activeRegisters[0]?.id || '';
  const receive = useMutation({
    mutationFn: () =>
      withApproval((headers) =>
        customerAccountsApi.receivePayment(
          customerId,
          {
            amount: Math.round(Number(payAmount) * 100) / 100,
            paymentMethodId: payMethod!.id,
            reference: payReference.trim() || undefined,
            registerId: payMethod?.methodType === 'cash' ? register : undefined,
            idempotencyKey: payKey.current,
          },
          headers
        )
      ),
    onSuccess: () => {
      payKey.current = newIdempotencyKey();
      setPaying(false);
      setPayAmount('');
      setPayReference('');
      refresh();
    },
  });

  // ---- Adjust ----
  const [adjusting, setAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const adjustKey = useRef(newIdempotencyKey());
  const adjust = useMutation({
    mutationFn: () =>
      withApproval((headers) =>
        customerAccountsApi.adjust(
          customerId,
          { amount: Math.round(Number(adjustAmount) * 100) / 100, reason: adjustReason.trim() },
          adjustKey.current,
          headers
        )
      ),
    onSuccess: () => {
      adjustKey.current = newIdempotencyKey();
      setAdjusting(false);
      setAdjustAmount('');
      setAdjustReason('');
      refresh();
    },
  });

  // ---- Statement ----
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [statement, setStatement] = useState<Statement | null>(null);
  const statementQuery = useMutation({
    mutationFn: () => customerAccountsApi.statement(customerId, from, to),
    onSuccess: setStatement,
  });

  if (error) return <ErrorMessage>{getErrorMessage(error, 'Could not load the account')}</ErrorMessage>;
  if (!account) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label={t('Balance')} value={money(account.balance)} strong />
        <Stat label={t('Credit limit')} value={money(account.creditLimit)} />
        <Stat label={t('Available credit')} value={money(account.available)} />
        <Stat label={t('Payment terms')} value={t('{days} days', { days: account.paymentTermDays })} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {account.creditHold && <Badge variant="danger">{t('On credit hold')}</Badge>}
        {Math.round(account.ledgerBalance * 100) !== Math.round(account.balance * 100) && (
          <Badge variant="warning">
            {t('Ledger total {amount} differs from the balance', { amount: money(account.ledgerBalance) })}
          </Badge>
        )}
        {storeCredit && Number(storeCredit.balance) > 0 && (
          <Badge variant="success">{t('Store credit: {amount}', { amount: money(Number(storeCredit.balance)) })}</Badge>
        )}
      </div>

      {smallScreen ? (
        // Phones: the age buckets as label / value pairs instead of a six-column row
        <div className="rounded-md border p-3 text-sm">
          <DataCardFields>
            {AGING_COLUMNS.map(([key, label]) => (
              <DataCardField key={key} label={t(label)}>
                <span className={cn(key !== 'current' && account.aging[key] > 0 && 'text-red-600')}>
                  {money(account.aging[key])}
                </span>
              </DataCardField>
            ))}
            <DataCardField label={t('Total')}>
              <span className="font-semibold">{money(account.aging.total)}</span>
            </DataCardField>
          </DataCardFields>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {AGING_COLUMNS.map(([key, label]) => (
                  <th key={key} className="px-3 py-2 text-right font-medium">
                    {t(label)}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">{t('Total')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {AGING_COLUMNS.map(([key]) => (
                  <td
                    key={key}
                    className={cn('px-3 py-2 text-right', key !== 'current' && account.aging[key] > 0 && 'text-red-600')}
                  >
                    {money(account.aging[key])}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold">{money(account.aging.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canReceive && (
          <Button variant="outline" size="sm" onClick={() => setPaying(!paying)}>
            <BookOpen className="h-4 w-4" />
            {t('Receive payment')}
          </Button>
        )}
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setAdjusting(!adjusting)}>
            {t('Adjust balance')}
          </Button>
        )}
      </div>

      {paying && (
        <form
          className="grid gap-2 rounded-md border p-3 sm:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault();
            receive.mutate();
          }}
        >
          <Field label={t('Amount')} htmlFor="pay-amount">
            <Input id="pay-amount" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <Field label={t('Paid with')} htmlFor="pay-method">
            <Select id="pay-method" value={payMethod?.id ?? ''} onChange={(e) => setPayMethodId(e.target.value)}>
              {payMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {text(m.name, m.code)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('Reference')} htmlFor="pay-reference">
            <Input id="pay-reference" value={payReference} onChange={(e) => setPayReference(e.target.value)} />
          </Field>
          {payMethod?.methodType === 'cash' ? (
            <Field label={t('Register')} htmlFor="pay-register" hint={t('Cash goes into its open shift')}>
              <Select id="pay-register" value={register} onChange={(e) => setPayRegisterId(e.target.value)}>
                {activeRegisters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div />
          )}
          <div className="flex items-end">
            <Button type="submit" disabled={receive.isPending || !Number(payAmount) || !payMethod}>
              {receive.isPending ? t('Saving...') : t('Record payment')}
            </Button>
          </div>
          <div className="sm:col-span-5">
            <ErrorMessage>{receive.error ? getErrorMessage(receive.error, 'Could not record the payment') : null}</ErrorMessage>
          </div>
        </form>
      )}

      {adjusting && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            adjust.mutate();
          }}
        >
          <Field label={t('Amount (+ owes more, − owes less)')} htmlFor="adjust-amount">
            <Input
              id="adjust-amount"
              inputMode="decimal"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder={t('+25.00 or -10.00')}
              className="w-40"
            />
          </Field>
          <Field label={t('Reason')} htmlFor="adjust-reason">
            <Input
              id="adjust-reason"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder={t('Reason (required)')}
              className="min-w-64 max-md:min-w-0"
            />
          </Field>
          <Button type="submit" disabled={adjust.isPending || !Number(adjustAmount) || !adjustReason.trim()}>
            {t('Adjust')}
          </Button>
          <div className="w-full">
            <ErrorMessage>{adjust.error ? getErrorMessage(adjust.error, 'Could not adjust the account') : null}</ErrorMessage>
          </div>
        </form>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('Account entries')}</h3>
        <div className="max-h-64 overflow-y-auto rounded-md border text-sm">
          {!entries?.data.length ? (
            <p className="p-3 text-center text-gray-400">{t('No account activity yet.')}</p>
          ) : smallScreen ? (
            // Phones: one stacked row per entry (what / amount, then date / balance after)
            <ul className="divide-y">
              {entries.data.map((entry) => (
                <li key={entry.id} className="space-y-0.5 px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 break-words">
                      {t(ENTRY_LABELS[entry.type] ?? entry.type)}
                      {(entry.note || entry.paymentRef) && (
                        <span className="block text-xs text-gray-500">
                          {[entry.note && translateServerNote(entry.note), entry.paymentRef].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {entry.dueDate && entry.amount > 0 && (
                        <span className="block text-xs text-gray-500">
                          {t('Due {date}', { date: formatDate(entry.dueDate) })}
                        </span>
                      )}
                    </div>
                    <span className={cn('shrink-0 font-medium', entry.amount > 0 ? 'text-red-600' : 'text-green-700')}>
                      {entry.amount > 0 ? '+' : ''}
                      {money(entry.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                    <span>{formatDateTime(entry.createdAt)}</span>
                    <span>{money(entry.balanceAfter)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <table className="w-full">
              <tbody className="divide-y">
                {entries.data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-gray-500">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-3 py-1.5">
                      {t(ENTRY_LABELS[entry.type] ?? entry.type)}
                      {(entry.note || entry.paymentRef) && (
                        <span className="block text-xs text-gray-500">
                          {[entry.note && translateServerNote(entry.note), entry.paymentRef].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {entry.dueDate && entry.amount > 0 && (
                        <span className="block text-xs text-gray-500">{t('Due {date}', { date: formatDate(entry.dueDate) })}</span>
                      )}
                    </td>
                    <td className={cn('px-3 py-1.5 text-right font-medium', entry.amount > 0 ? 'text-red-600' : 'text-green-700')}>
                      {entry.amount > 0 ? '+' : ''}
                      {money(entry.amount)}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-500">{money(entry.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('Statement')}</h3>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            statementQuery.mutate();
          }}
        >
          <Field label={t('From')} htmlFor="statement-from">
            <Input id="statement-from" type="date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('To')} htmlFor="statement-to">
            <Input id="statement-to" type="date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Button type="submit" variant="outline" disabled={statementQuery.isPending || !from || !to}>
            {t('Show statement')}
          </Button>
          {statement && (
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('Print')}
            </Button>
          )}
        </form>
        <ErrorMessage>{statementQuery.error ? getErrorMessage(statementQuery.error, 'Could not load the statement') : null}</ErrorMessage>
        {statement && <StatementDocument statement={statement} currency={currency} />}
      </div>
      {approvalDialog}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md bg-gray-50 p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={cn('font-medium', strong && 'text-lg font-semibold')}>{value}</div>
    </div>
  );
}

/** Printable statement (A4): opening balance, entries, closing balance and aging */
export function StatementDocument({ statement, currency }: { statement: Statement; currency: string }) {
  const { data: settings } = useStoreSettings();
  const money = (value: number) => formatMoney(value, currency);
  return (
    <div className="print-receipt receipt-a4 rounded-md border bg-white p-4 text-sm text-black">
      <div className="flex justify-between">
        <div>
          <div className="text-base font-bold">{settings?.storeName}</div>
          <div className="text-gray-600">{settings?.businessPhone}</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold uppercase">{t('Statement of account')}</div>
          <div>
            {formatDate(statement.from)} – {formatDate(statement.to)}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="font-medium">{customerName(statement.customer)}</div>
        <div className="text-gray-600">{[statement.customer.code, statement.customer.phone, statement.customer.email].filter(Boolean).join(' · ')}</div>
      </div>
      <table className="mt-3 w-full">
        <thead className="border-b text-xs text-gray-500">
          <tr>
            <th className="py-1 text-left font-medium">{t('Date')}</th>
            <th className="py-1 text-left font-medium">{t('Description')}</th>
            <th className="py-1 text-right font-medium">{t('Amount')}</th>
            <th className="py-1 text-right font-medium">{t('Balance')}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-1" colSpan={3}>
              {t('Opening balance')}
            </td>
            <td className="py-1 text-right">{money(statement.openingBalance)}</td>
          </tr>
          {statement.lines.map((line) => (
            <tr key={line.id} className="border-b border-gray-100">
              <td className="py-1">{formatDate(line.date)}</td>
              <td className="py-1">
                {t(ENTRY_LABELS[line.type] ?? line.type)}
                {line.note && <span className="text-gray-600"> · {translateServerNote(line.note)}</span>}
                {line.reference && <span className="text-gray-600"> · {line.reference}</span>}
              </td>
              <td className="py-1 text-right">{money(line.amount)}</td>
              <td className="py-1 text-right">{money(line.balance)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-1" colSpan={3}>
              {t('Closing balance')}
            </td>
            <td className="py-1 text-right">{money(statement.closingBalance)}</td>
          </tr>
        </tbody>
      </table>
      <table className="mt-4 w-full text-xs">
        <thead className="text-gray-500">
          <tr>
            {AGING_COLUMNS.map(([key, label]) => (
              <th key={key} className="text-right font-medium">
                {t(label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {AGING_COLUMNS.map(([key]) => (
              <td key={key} className="text-right">
                {money(statement.aging[key])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
