'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import {
  Customer,
  customerGroupsApi,
  customerName,
  customersApi,
  DuplicatePair,
  MERGE_FIELDS,
  MergeChoices,
  MergeField,
} from '@/lib/api/customers';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

type Side = 'survivor' | 'merged';

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

/**
 * Choose which record to keep and, per field, which value survives; then merge.
 */
export function CustomerMergeDialog({
  pair,
  onClose,
  onMerged,
}: {
  pair: DuplicatePair | null;
  onClose: () => void;
  onMerged: () => void;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  // Keep the older record by default (it has the longer history)
  const [keepA, setKeepA] = useState(() =>
    pair ? new Date(pair.a.createdAt).getTime() <= new Date(pair.b.createdAt).getTime() : true
  );
  const [choices, setChoices] = useState<MergeChoices>({});
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [] } = useQuery({
    queryKey: ['customer-groups'],
    queryFn: () => customerGroupsApi.list(),
    enabled: !!pair,
  });

  const survivor = pair ? (keepA ? pair.a : pair.b) : null;
  const merged = pair ? (keepA ? pair.b : pair.a) : null;

  const display = (field: MergeField, customer: Customer): string => {
    const value = customer[field];
    if (isEmpty(value)) return '—';
    if (field === 'groupId') return groups.find((g) => g.id === value)?.name ?? '—';
    if (field === 'dateOfBirth') return formatDate(value as string);
    if (field === 'creditLimit') return formatMoney(value as number, currency);
    return String(value);
  };

  // Default: survivor's value, or the merged one when the survivor's is empty
  const chosen = (field: MergeField): Side =>
    choices[field] ?? (survivor && isEmpty(survivor[field]) && merged && !isEmpty(merged[field]) ? 'merged' : 'survivor');

  const merge = useMutation({
    mutationFn: () => {
      const resolved = Object.fromEntries(MERGE_FIELDS.map(([field]) => [field, chosen(field)])) as MergeChoices;
      return customersApi.merge({ survivorId: survivor!.id, mergedId: merged!.id, choices: resolved });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onMerged();
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not merge customers')),
  });

  const differing = survivor && merged ? MERGE_FIELDS.filter(([field]) => display(field, survivor) !== display(field, merged)) : [];

  return (
    <Dialog open={!!pair} onOpenChange={(open) => !open && !merge.isPending && onClose()}>
      <DialogContent className="max-w-3xl">
        {survivor && merged && (
          <>
            <DialogHeader>
              <DialogTitle>{t('Merge customers')}</DialogTitle>
              <DialogDescription>
                {t("{merged} ({mergedCode}) will be merged into {survivor} ({survivorCode}). This can't be undone.", {
                  merged: customerName(merged),
                  mergedCode: merged.code,
                  survivor: customerName(survivor),
                  survivorCode: survivor.code,
                })}
              </DialogDescription>
            </DialogHeader>
            <ErrorMessage>{error}</ErrorMessage>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">{t('Keep record:')}</span>
              {[pair!.a, pair!.b].map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    setKeepA(customer.id === pair!.a.id);
                    setChoices({});
                  }}
                  className={cn(
                    'rounded-md border px-3 py-1.5',
                    customer.id === survivor.id ? 'border-blue-600 bg-blue-50 font-medium text-blue-800' : 'hover:bg-gray-50'
                  )}
                >
                  {t('{code} · since {date}', { code: customer.code, date: formatDate(customer.createdAt) })}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Field')}</th>
                    <th className="px-3 py-2 font-medium">{t('Keep ({code})', { code: survivor.code })}</th>
                    <th className="px-3 py-2 font-medium">{t('Merged ({code})', { code: merged.code })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {differing.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-center text-gray-400">
                        {t('Both records have the same details.')}
                      </td>
                    </tr>
                  )}
                  {differing.map(([field, label]) => (
                    <tr key={field}>
                      <td className="px-3 py-2 text-gray-600">{t(label)}</td>
                      {(['survivor', 'merged'] as const).map((side) => (
                        <td key={side} className="px-3 py-2">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="radio"
                              name={`merge-${field}`}
                              checked={chosen(field) === side}
                              onChange={() => setChoices((c) => ({ ...c, [field]: side }))}
                            />
                            {display(field, side === 'survivor' ? survivor : merged)}
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>
                {t('Loyalty points: {total} ({a} + {b}); balance: {balance}', {
                  total: Number(survivor.loyaltyPoints) + Number(merged.loyaltyPoints),
                  a: survivor.loyaltyPoints,
                  b: merged.loyaltyPoints,
                  // Hidden without customers.finance.view
                  balance:
                    survivor.currentBalance == null || merged.currentBalance == null
                      ? '—'
                      : formatMoney(Number(survivor.currentBalance) + Number(merged.currentBalance), currency),
                })}
              </li>
              <li>
                {t('Purchases and other records of {from} move to {to}.', { from: merged.code, to: survivor.code })}
              </li>
              <li>
                {survivor.consentUpdatedAt || merged.consentUpdatedAt
                  ? t(
                      'Marketing consent: the most recent decision is kept (last changed {date}); both consent histories are kept.',
                      {
                        date: formatDateTime(
                          new Date(
                            Math.max(
                              new Date(survivor.consentUpdatedAt ?? 0).getTime(),
                              new Date(merged.consentUpdatedAt ?? 0).getTime()
                            )
                          )
                        ),
                      }
                    )
                  : t('Marketing consent: the most recent decision is kept; both consent histories are kept.')}
              </li>
              <li>{t('{code} becomes inactive and is hidden from customer searches.', { code: merged.code })}</li>
            </ul>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={merge.isPending}>
                {t('Cancel')}
              </Button>
              <Button
                type="button"
                disabled={merge.isPending}
                onClick={() => {
                  setError(null);
                  merge.mutate();
                }}
              >
                {merge.isPending ? t('Merging...') : t('Merge into {code}', { code: survivor.code })}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
