'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field, PageHeader } from '@/components/admin/page-header';
import { ExpenseFormDialog } from '@/components/admin/expenses-form-dialog';
import { ExpenseCategoriesSection } from '@/components/admin/expenses-categories';
import { useApproval } from '@/components/approval-dialog';
import { getErrorMessage, newIdempotencyKey } from '@/lib/api/client';
import { Expense, expenseCategoriesApi, expensesApi, ExpenseStatus, PAYMENT_METHOD_LABELS } from '@/lib/api/expenses';
import { registersApi } from '@/lib/api/settings';
import { formatDate, formatMoney } from '@/lib/format';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { t, plural } from '@/i18n';

const STATUS_VARIANT: Record<ExpenseStatus, 'default' | 'info' | 'success' | 'warning' | 'danger'> = {
  draft: 'default',
  submitted: 'warning',
  approved: 'info',
  rejected: 'danger',
  paid: 'success',
};

export default function ExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const canApprove = hasPermission(user, 'expenses.approve');
  const canCreate = hasPermission(user, 'expenses.create');
  const queryClient = useQueryClient();
  const { withApproval, approvalDialog } = useApproval();

  const [tab, setTab] = useState<'expenses' | 'categories'>('expenses');
  const [status, setStatus] = useState<ExpenseStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [rejecting, setRejecting] = useState<Expense | null>(null);
  const [paying, setPaying] = useState<Expense | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });
  const { data, isLoading, error } = useQuery({
    queryKey: ['expenses', status, categoryId, debounced, page],
    queryFn: () =>
      expensesApi.list({
        status: status || undefined,
        categoryId: categoryId || undefined,
        search: debounced || undefined,
        page,
        limit: 25,
      }),
    placeholderData: (previous) => previous,
    enabled: tab === 'expenses',
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const action = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onMutate: () => setActionError(null),
    onError: (err) => setActionError(getErrorMessage(err, 'The action failed')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const approve = (e: Expense) => action.mutate(() => withApproval((headers) => expensesApi.approve(e.id, headers)));

  // Row buttons, shared by the table and the phone cards
  const rowActions = (e: Expense, mine: boolean, editable: boolean) => (
    <>
      {editable && (
        <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
          {t('Edit')}
        </Button>
      )}
      {e.status === 'draft' && (mine || canApprove) && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => action.mutate(() => expensesApi.submit(e.id))}
        >
          {t('Submit')}
        </Button>
      )}
      {e.status === 'submitted' && (
        <Button size="sm" onClick={() => approve(e)} disabled={action.isPending}>
          {t('Approve')}
        </Button>
      )}
      {(e.status === 'submitted' || e.status === 'approved') && canApprove && (
        <Button size="sm" variant="ghost" onClick={() => setRejecting(e)}>
          {t('Reject')}
        </Button>
      )}
      {e.status === 'approved' && (
        <Button size="sm" onClick={() => setPaying(e)}>
          {t('Pay')}
        </Button>
      )}
      {editable && (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-600"
          onClick={() => {
            if (window.confirm(t('Delete {name}?', { name: e.expenseNumber }))) {
              action.mutate(() => expensesApi.remove(e.id));
            }
          }}
        >
          {t('Delete')}
        </Button>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Expenses')}
        description={`${t('Record, approve and pay store expenses.')} ${
          canApprove ? t('Expenses above the approval threshold need a second person to approve them.') : ''
        }`}
        actions={
          canCreate && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" />
              {t('New expense')}
            </Button>
          )
        }
      />

      <div className="flex gap-1 border-b">
        {(['expenses', 'categories'] as const).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm capitalize ${
              tab === tabKey ? 'border-blue-600 font-medium text-blue-700' : 'border-transparent text-gray-600'
            }`}
          >
            {t(tabKey)}
          </button>
        ))}
      </div>

      {tab === 'categories' ? (
        <ExpenseCategoriesSection canManage={canApprove} />
      ) : (
        <Card className="bg-white">
          <div className="flex flex-col gap-2 border-b p-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search description, payee, number, receipt')}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ExpenseStatus | '');
                setPage(1);
              }}
              className="md:w-44"
              aria-label={t('Status')}
            >
              <option value="">{t('All statuses')}</option>
              {Object.keys(STATUS_VARIANT).map((s) => (
                <option key={s} value={s} className="capitalize">
                  {t(s)}
                </option>
              ))}
            </Select>
            <Select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className="md:w-48"
              aria-label={t('Category')}
            >
              <option value="">{t('All categories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {(error || actionError) && (
            <div className="m-4">
              <ErrorMessage>{actionError ?? getErrorMessage(error, 'Could not load expenses')}</ErrorMessage>
            </div>
          )}

          {smallScreen ? (
            <DataCards
              items={rows}
              getKey={(e) => e.id}
              loading={isLoading}
              loadingText={t('Loading...')}
              emptyText={t('No expenses match.')}
            >
              {(e) => {
                const mine = e.createdById === user?.id;
                const editable = (e.status === 'draft' || e.status === 'rejected') && (mine || canApprove);
                const actions = rowActions(e, mine, editable);
                return (
                  <>
                    <DataCardHeader
                      title={e.description}
                      subtitle={e.expenseNumber}
                      badge={<Badge variant={STATUS_VARIANT[e.status]}>{t(e.status)}</Badge>}
                    />
                    <DataCardFields>
                      <DataCardField label={t('Amount')}>
                        <span className="font-medium tabular-nums">{formatMoney(e.amount, e.currencyCode)}</span>
                      </DataCardField>
                      <DataCardField label={t('Date')}>{formatDate(`${e.expenseDate}T12:00:00`)}</DataCardField>
                      <DataCardField label={t('Category')}>{e.categoryName ?? '—'}</DataCardField>
                      <DataCardField label={t('Paid by')}>{t(PAYMENT_METHOD_LABELS[e.paymentMethod])}</DataCardField>
                      {(e.payee || e.receiptReference || e.createdByName || e.approvedByName) && (
                        <DataCardField label={t('Details')} full>
                          <span className="text-xs text-gray-600">
                            {[
                              e.payee,
                              e.receiptReference && t('Receipt {reference}', { reference: e.receiptReference }),
                              e.createdByName,
                              e.approvedByName && e.status !== 'rejected' && t('by {name}', { name: e.approvedByName }),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </DataCardField>
                      )}
                      {e.status === 'rejected' && e.rejectionReason && (
                        <DataCardField label={t('Status')} full>
                          <span className="text-xs text-red-600">
                            {t('Rejected: {reason}', { reason: e.rejectionReason })}
                          </span>
                        </DataCardField>
                      )}
                    </DataCardFields>
                    {(editable || e.status === 'submitted' || e.status === 'approved') && (
                      <DataCardActions>{actions}</DataCardActions>
                    )}
                  </>
                );
              }}
            </DataCards>
          ) : (
          <Table>
            <THead>
              <tr>
                <Th>{t('Number|id')}</Th>
                <Th>{t('Date')}</Th>
                <Th>{t('Description')}</Th>
                <Th>{t('Category')}</Th>
                <Th>{t('Paid by')}</Th>
                <Th>{t('Status')}</Th>
                <Th className="text-right">{t('Amount')}</Th>
                <Th />
              </tr>
            </THead>
            <TBody>
              {isLoading ? (
                <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={8}>{t('No expenses match.')}</EmptyRow>
              ) : (
                rows.map((e) => {
                  const mine = e.createdById === user?.id;
                  const editable = (e.status === 'draft' || e.status === 'rejected') && (mine || canApprove);
                  return (
                    <tr key={e.id}>
                      <Td className="whitespace-nowrap font-medium">{e.expenseNumber}</Td>
                      <Td className="whitespace-nowrap">{formatDate(`${e.expenseDate}T12:00:00`)}</Td>
                      <Td>
                        {e.description}
                        <span className="block text-xs text-gray-500">
                          {[e.payee, e.receiptReference && t('Receipt {reference}', { reference: e.receiptReference }), e.createdByName]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {e.status === 'rejected' && e.rejectionReason && (
                          <span className="block text-xs text-red-600">
                            {t('Rejected: {reason}', { reason: e.rejectionReason })}
                          </span>
                        )}
                      </Td>
                      <Td>{e.categoryName ?? '—'}</Td>
                      <Td>{t(PAYMENT_METHOD_LABELS[e.paymentMethod])}</Td>
                      <Td>
                        <Badge variant={STATUS_VARIANT[e.status]}>{t(e.status)}</Badge>
                        {e.approvedByName && e.status !== 'rejected' && (
                          <span className="block text-xs text-gray-500">{t('by {name}', { name: e.approvedByName })}</span>
                        )}
                      </Td>
                      <Td className="text-right tabular-nums">{formatMoney(e.amount, e.currencyCode)}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          {rowActions(e, mine, editable)}
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-3 text-sm text-gray-600">
              <span>
                {t('Page {page} of {total}', { page: meta.page, total: meta.totalPages })} ·{' '}
                {plural(meta.total, '{count} expense', '{count} expenses')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage(page - 1)}>
                  {t('Previous')}
                </Button>
                <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage(page + 1)}>
                  {t('Next')}
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ExpenseFormDialog
        open={!!editing}
        expense={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
      />
      <RejectDialog expense={rejecting} onClose={() => setRejecting(null)} />
      <PayDialog expense={paying} onClose={() => setPaying(null)} />
      {approvalDialog}
    </div>
  );
}

function RejectDialog({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  return (
    <Dialog open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {expense && <RejectForm key={expense.id} expense={expense} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RejectForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const reject = useMutation({
    mutationFn: () => expensesApi.reject(expense.id, reason.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    },
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Reject {name}', { name: expense.expenseNumber })}</DialogTitle>
        <DialogDescription>{t('The person who recorded it can edit and resubmit it.')}</DialogDescription>
      </DialogHeader>
      <ErrorMessage>{reject.error ? getErrorMessage(reject.error, 'Could not reject') : null}</ErrorMessage>
      <Field label={t('Reason')} htmlFor="reject-reason">
        <Input
          id="reject-reason"
          autoFocus
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('Cancel')}
        </Button>
        <Button
          variant="destructive"
          disabled={reason.trim().length < 2 || reject.isPending}
          onClick={() => reject.mutate()}
        >
          {t('Reject')}
        </Button>
      </div>
    </>
  );
}

function PayDialog({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  return (
    <Dialog open={!!expense} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        {expense && <PayForm key={expense.id} expense={expense} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PayForm({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: registers = [] } = useQuery({ queryKey: ['registers'], queryFn: () => registersApi.list() });
  const [registerId, setRegisterId] = useState(expense.registerId ?? '');
  const [reference, setReference] = useState('');
  // One per dialog: a retried payment is not paid out twice
  const [idempotencyKey] = useState(newIdempotencyKey);
  const pay = useMutation({
    mutationFn: () =>
      expensesApi.pay(
        expense.id,
        {
          registerId: expense.paymentMethod === 'cash' && registerId ? registerId : undefined,
          reference: reference.trim() || undefined,
        },
        idempotencyKey
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      await queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Pay {name}', { name: expense.expenseNumber })}</DialogTitle>
        <DialogDescription>
          {expense.payee
            ? t('{amount} by {method} to {payee}.', {
                amount: formatMoney(expense.amount, expense.currencyCode),
                method: t(PAYMENT_METHOD_LABELS[expense.paymentMethod]).toLowerCase(),
                payee: expense.payee,
              })
            : t('{amount} by {method}.', {
                amount: formatMoney(expense.amount, expense.currencyCode),
                method: t(PAYMENT_METHOD_LABELS[expense.paymentMethod]).toLowerCase(),
              })}
        </DialogDescription>
      </DialogHeader>
      <ErrorMessage>{pay.error ? getErrorMessage(pay.error, 'Could not pay the expense') : null}</ErrorMessage>
      {expense.paymentMethod === 'cash' && (
        <Field
          label={t('Paid from till')}
          htmlFor="pay-register"
          hint={t("Cash from a till is recorded on that register's open shift.")}
        >
          <Select id="pay-register" value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
            <option value="">{t('Not from a till (petty cash)')}</option>
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={t('Payment reference (optional)')} htmlFor="pay-reference">
        <Input id="pay-reference" maxLength={255} value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('Cancel')}
        </Button>
        <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
          {pay.isPending ? t('Paying...') : t('Mark paid')}
        </Button>
      </div>
    </>
  );
}
