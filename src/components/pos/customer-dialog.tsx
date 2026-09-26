'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Search, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { Select } from '@/components/ui/select';
import { customerName, customersApi } from '@/lib/api/customers';
import { customerAccountsApi } from '@/lib/api/customer-accounts';
import { ONLINE_ONLY_TENDERS } from '@/lib/api/stored-value';
import type { PaymentMethod } from '@/lib/api/settings';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { formatMoney } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import type { CartCustomer } from '@/stores/pos-store';
import { t } from '@/i18n';

/**
 * Look up a customer for the sale, or add a new one on the spot
 */
export function CustomerDialog({
  open,
  onOpenChange,
  current,
  onSelect,
  online,
  registerId,
  paymentMethods = [],
  currency = 'USD',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: CartCustomer | null;
  onSelect: (customer: CartCustomer | null) => void;
  online: boolean;
  // For taking a payment on the customer's account (cash goes into this register's shift)
  registerId?: string | null;
  paymentMethods?: PaymentMethod[];
  currency?: string;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: customers = [], isFetching } = useQuery({
    queryKey: ['pos', 'customers', debounced],
    queryFn: () => customersApi.list({ search: debounced, status: 'active' }),
    enabled: open && online && debounced.length >= 2,
  });

  const choose = (customer: CartCustomer | null) => {
    onSelect(customer);
    onOpenChange(false);
    setSearch('');
    setCreating(false);
  };

  const create = async () => {
    setError(null);
    try {
      const customer = await customersApi.create({
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      } as never);
      choose({ id: customer.id, name: customerName(customer), loyaltyPoints: customer.loyaltyPoints });
      setForm({ firstName: '', lastName: '', phone: '', email: '' });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create customer'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Customer')}</DialogTitle>
          <DialogDescription>
            {online
              ? t('Search by name, phone, email or customer code.')
              : t('Customer lookup needs a connection. The sale can continue as a walk-in.')}
          </DialogDescription>
        </DialogHeader>

        {current && (
          <div className="flex items-center justify-between rounded-md bg-blue-50 p-3 text-sm">
            <span>
              <span className="font-medium">{current.name}</span> · {t('{points} points', { points: current.loyaltyPoints })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => choose(null)}>
              <X className="h-4 w-4" />
              {t('Remove')}
            </Button>
          </div>
        )}

        {current && online && (
          <AccountPayment
            customer={current}
            registerId={registerId ?? null}
            paymentMethods={paymentMethods}
            currency={currency}
          />
        )}

        {online && !creating && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Type at least 2 characters...')}
                className="pl-10"
              />
            </div>
            <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
              {debounced.length < 2 ? (
                <p className="p-4 text-center text-sm text-gray-400">{t('Start typing to search')}</p>
              ) : isFetching && customers.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">{t('Searching...')}</p>
              ) : customers.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">{t('No customers found')}</p>
              ) : (
                customers.map((customer) => (
                  <button
                    key={customer.id}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() =>
                      choose({ id: customer.id, name: customerName(customer), loyaltyPoints: customer.loyaltyPoints })
                    }
                  >
                    <span>
                      <span className="font-medium">{customerName(customer)}</span>
                      <span className="block text-xs text-gray-500">
                        {[customer.code, customer.phone, customer.email].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">{t('{points} pts', { points: customer.loyaltyPoints })}</span>
                  </button>
                ))
              )}
            </div>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <UserPlus className="h-4 w-4" />
              {t('New customer')}
            </Button>
          </>
        )}

        {online && creating && (
          <div className="space-y-3">
            <ErrorMessage>{error}</ErrorMessage>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t('First name')} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoFocus />
              <Input placeholder={t('Last name')} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              <Input placeholder={t('Phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder={t('Email')} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>{t('Back')}</Button>
              <Button onClick={create} disabled={!form.firstName.trim() && !form.lastName.trim()}>
                {t('Add customer')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Take a payment on the customer's account at the till (customers.credit.receive).
 * Cash goes into the register's open shift.
 */
function AccountPayment({
  customer,
  registerId,
  paymentMethods,
  currency,
}: {
  customer: CartCustomer;
  registerId: string | null;
  paymentMethods: PaymentMethod[];
  currency: string;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canReceive = hasPermission(user, 'customers.credit.receive');
  const canSeeBalance = hasPermission(user, 'customers.finance.view');
  const [openForm, setOpenForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  // Large non-cash payments need a manager's approval
  const { withApproval, approvalDialog } = useApproval();

  const { data: account } = useQuery({
    queryKey: ['customer-account', customer.id],
    queryFn: () => customerAccountsApi.account(customer.id),
    enabled: canSeeBalance,
  });
  const methods = paymentMethods.filter((m) => !ONLINE_ONLY_TENDERS.includes(m.code) && m.code !== 'LOYALTY');
  const method = methods.find((m) => m.id === methodId) ?? methods[0];

  if (!canReceive) return null;

  const submit = async () => {
    const value = Number(amount);
    if (!method || !Number.isFinite(value) || value <= 0) {
      setError(t('Enter an amount greater than zero'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await withApproval((headers) =>
        customerAccountsApi.receivePayment(
          customer.id,
          {
            amount: Math.round(value * 100) / 100,
            paymentMethodId: method.id,
            reference: reference.trim() || undefined,
            registerId: registerId ?? undefined,
            idempotencyKey: key.current,
          },
          headers
        )
      );
      key.current = newIdempotencyKey();
      setDone(
        t('Payment of {amount} recorded', { amount: formatMoney(Math.abs(result.entry.amount), currency) })
      );
      setAmount('');
      setReference('');
      setOpenForm(false);
      queryClient.invalidateQueries({ queryKey: ['customer-account', customer.id] });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not record the payment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      {approvalDialog}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-medium">
          <BookOpen className="h-4 w-4" />
          {account
            ? t('Account balance: {amount}', { amount: formatMoney(account.balance, currency) })
            : t('Customer account')}
        </span>
        {!openForm && (
          <Button variant="outline" size="sm" onClick={() => setOpenForm(true)}>
            {t('Take a payment')}
          </Button>
        )}
      </div>
      {account?.creditHold && <p className="text-xs text-red-600">{t('On credit hold: no new sales on account')}</p>}
      {done && <p className="text-xs text-green-700">{done}</p>}
      <ErrorMessage>{error}</ErrorMessage>
      {openForm && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            autoFocus
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('Amount')}
            aria-label={t('Amount')}
            className="w-28"
          />
          <Select
            value={method?.id ?? ''}
            onChange={(e) => setMethodId(e.target.value)}
            aria-label={t('Paid with')}
            className="w-36"
          >
            {methods.map((m) => (
              <option key={m.id} value={m.id}>
                {text(m.name, m.code)}
              </option>
            ))}
          </Select>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t('Reference')}
            aria-label={t('Reference')}
            className="min-w-24 flex-1"
          />
          <Button type="submit" disabled={busy || !amount}>
            {busy ? t('Saving...') : t('Record payment')}
          </Button>
        </form>
      )}
    </div>
  );
}
