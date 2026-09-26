'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { loyaltyApi, LoyaltyTransaction } from '@/lib/api/loyalty';
import { getErrorMessage } from '@/lib/api/client';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { currentLocale, t } from '@/i18n';
import { translateServerNote } from '@/lib/server-texts';

// English labels, translated at render
const TYPE_LABEL: Record<LoyaltyTransaction['type'], string> = {
  earn: 'Earned',
  redeem: 'Spent',
  reversal: 'Reversed',
  adjustment: 'Adjustment',
};

/**
 * Loyalty balance, its value, the full points history and manual adjustments
 */
export function CustomerLoyaltyPanel({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const user = useAuthStore((state) => state.user);
  // customers.credit.manage adjusts; customer managers can with a manager's approval
  const canAdjust = hasPermission(user, 'customers.credit.manage') || hasPermission(user, 'customers.manage');
  const { withApproval, approvalDialog } = useApproval();
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');

  const { data: balance } = useQuery({ queryKey: ['loyalty', customerId], queryFn: () => loyaltyApi.balance(customerId) });
  const { data: history = [] } = useQuery({
    queryKey: ['loyalty', customerId, 'history'],
    queryFn: () => loyaltyApi.history(customerId),
  });

  const adjust = useMutation({
    mutationFn: () =>
      withApproval((headers) => loyaltyApi.adjust(customerId, Math.round(Number(points)), note.trim(), headers)),
    onSuccess: () => {
      setPoints('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['loyalty', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return (
    <div className="space-y-3">
      {approvalDialog}
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Gift className="h-4 w-4" />
        {t('Loyalty points')}
      </h3>
      {balance && (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{balance.points.toLocaleString(currentLocale())}</span>
          <span className="text-sm text-gray-500">
            {t('points · worth {value}', { value: formatMoney(balance.value, currency) })}
          </span>
          {!balance.rules.enabled && <span className="text-xs text-amber-700">{t('(programme is off)')}</span>}
        </div>
      )}

      {canAdjust && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            adjust.mutate();
          }}
        >
          <Input
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            inputMode="numeric"
            placeholder={t('+100 or -50')}
            className="w-32"
            aria-label={t('Points to add or remove')}
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('Reason (required)')}
            className="min-w-48 flex-1"
            aria-label={t('Reason')}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={adjust.isPending || !note.trim() || !Number(points) || Number.isNaN(Number(points))}
          >
            {t('Adjust')}
          </Button>
        </form>
      )}
      <ErrorMessage>{adjust.error ? getErrorMessage(adjust.error, 'Could not adjust points') : null}</ErrorMessage>

      <div className="max-h-56 overflow-y-auto rounded-md border text-sm">
        {history.length === 0 ? (
          <p className="p-3 text-center text-gray-400">{t('No points activity yet.')}</p>
        ) : (
          <table className="w-full">
            <tbody className="divide-y">
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-500">{formatDateTime(row.createdAt)}</td>
                  <td className="px-3 py-1.5">
                    {t(TYPE_LABEL[row.type] ?? row.type)}
                    {row.note && <span className="block text-xs text-gray-500">{translateServerNote(row.note)}</span>}
                  </td>
                  <td className={cn('px-3 py-1.5 text-right font-medium', row.points >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {row.points > 0 ? `+${row.points}` : row.points}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-500">{row.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
