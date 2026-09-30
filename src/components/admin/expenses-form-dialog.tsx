'use client';

import { CurrencyAmountField, currencyAmountInput, useMoneyCurrencies, type CurrencyAmount } from '@/components/admin/currency-amount-field';
import { useCurrency } from '@/hooks/use-store-settings';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import {
  Expense,
  expenseCategoriesApi,
  ExpenseInput,
  ExpensePaymentMethod,
  expensesApi,
  PAYMENT_METHOD_LABELS,
} from '@/lib/api/expenses';
import { registersApi } from '@/lib/api/settings';
import { t } from '@/i18n';
import { todayLocalIso } from '@/lib/format';

const today = () => todayLocalIso();

/**
 * Record a new expense or edit a draft / rejected one
 */
export function ExpenseFormDialog({
  open,
  expense,
  onClose,
}: {
  open: boolean;
  expense: Expense | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {open && <ExpenseForm key={expense?.id ?? 'new'} expense={expense} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseForm({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });
  const { data: registers = [] } = useQuery({ queryKey: ['registers'], queryFn: () => registersApi.list() });

  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? today());
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '');
  const storeCurrency = useCurrency();
  const { rates } = useMoneyCurrencies(storeCurrency);
  // Typed in the store currency or another accepted one (e.g. HTG)
  const [amount, setAmount] = useState<CurrencyAmount>(
    expense?.tenderedCurrency
      ? { currencyCode: expense.tenderedCurrency, amount: String(expense.tenderedAmount ?? '') }
      : { currencyCode: expense?.currencyCode ?? storeCurrency, amount: expense ? String(expense.amount) : '' }
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [payee, setPayee] = useState(expense?.payee ?? '');
  const [receiptReference, setReceiptReference] = useState(expense?.receiptReference ?? '');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(expense?.paymentMethod ?? 'cash');
  const [registerId, setRegisterId] = useState(expense?.registerId ?? '');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  // One per form: a retried create is not recorded twice
  const [idempotencyKey] = useState(newIdempotencyKey);

  const value = Number(amount.amount);
  const dateError = expenseDate && expenseDate > todayLocalIso() ? t('The expense date cannot be in the future') : undefined;
  const valid = value > 0 && description.trim().length >= 2 && !dateError;

  const save = useMutation({
    mutationFn: async (submit: boolean) => {
      const input: ExpenseInput = {
        expenseDate,
        categoryId: categoryId || null,
        ...currencyAmountInput(amount, storeCurrency, rates),
        description: description.trim(),
        payee: payee.trim() || null,
        receiptReference: receiptReference.trim() || null,
        paymentMethod,
        registerId: paymentMethod === 'cash' && registerId ? registerId : null,
        notes: notes.trim() || null,
      };
      if (expense) {
        const updated = await expensesApi.update(expense.id, input);
        return submit ? expensesApi.submit(updated.id) : updated;
      }
      // Omit nulls on create: the API only accepts values there
      const created = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null)) as ExpenseInput;
      return expensesApi.create({ ...created, submit }, idempotencyKey);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{expense ? t('Edit {name}', { name: expense.expenseNumber }) : t('New expense')}</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(true);
        }}
      >
        <ErrorMessage>{save.error ? getErrorMessage(save.error, 'Could not save the expense') : null}</ErrorMessage>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Date')} htmlFor="expense-date" error={dateError}>
            <Input
              id="expense-date"
              type="date"
              max={todayLocalIso()}
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </Field>
          <CurrencyAmountField
            id="expense-amount"
            label={t('Amount')}
            storeCurrency={storeCurrency}
            value={amount}
            onChange={setAmount}
          />
        </div>
        <Field label={t('Description')} htmlFor="expense-description">
          <Input
            id="expense-description"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('Category')} htmlFor="expense-category">
            <Select id="expense-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('Uncategorised')}</option>
              {categories
                .filter((c) => c.isActive || c.id === categoryId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label={t('Supplier / payee')} htmlFor="expense-payee">
            <Input id="expense-payee" maxLength={255} value={payee} onChange={(e) => setPayee(e.target.value)} />
          </Field>
          <Field label={t('Paid by')} htmlFor="expense-method">
            <Select
              id="expense-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(label)}
                </option>
              ))}
            </Select>
          </Field>
          {paymentMethod === 'cash' && (
            <Field
              label={t('From till')}
              htmlFor="expense-register"
              hint={t('Leave empty for petty cash outside the tills')}
            >
              <Select id="expense-register" value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
                <option value="">{t('Not from a till')}</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label={t('Receipt reference')} htmlFor="expense-receipt">
            <Input
              id="expense-receipt"
              maxLength={255}
              value={receiptReference}
              onChange={(e) => setReceiptReference(e.target.value)}
            />
          </Field>
        </div>
        <Field label={t('Notes')} htmlFor="expense-notes">
          <Textarea
            id="expense-notes"
            rows={2}
            maxLength={1000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
            {t('Cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => save.mutate(false)}
            disabled={save.isPending || !valid}
          >
            {t('Save draft')}
          </Button>
          <Button type="submit" disabled={save.isPending || !valid}>
            {t('Submit')}
          </Button>
        </div>
      </form>
    </>
  );
}
