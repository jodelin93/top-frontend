'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { getErrorMessage } from '@/lib/api/client';
import { MOVEMENT_LABELS, shiftsApi } from '@/lib/api/shifts';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { plural, t } from '@/i18n';

/**
 * Drawer ledger of a shift: every movement including the net cash of each sale
 * and the no-sale openings. Those two are a trace only: the expected cash is
 * computed from the payments, so they are marked "not in expected".
 */
export function ShiftLedgerPanel({ shiftId }: { shiftId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shifts', 'ledger', shiftId],
    queryFn: () => shiftsApi.ledger(shiftId),
  });

  if (isLoading) return <p className="text-sm text-gray-500">{t('Loading...')}</p>;
  if (error || !data) return <ErrorMessage>{getErrorMessage(error, 'Could not load the drawer ledger')}</ErrorMessage>;

  const money = (value: number) => formatMoney(value, data.currencyCode);
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        {plural(data.saleCount, '{count} cash sale', '{count} cash sales')} · {money(data.cashSalesTotal)} ·{' '}
        {plural(data.noSaleCount, '{count} drawer opening without a sale', '{count} drawer openings without a sale')}
      </p>
      <div className="max-h-[50vh] overflow-y-auto">
        <Table>
          <THead>
            <tr>
              <Th>{t('Time')}</Th>
              <Th>{t('Type')}</Th>
              <Th>{t('Reference')}</Th>
              <Th>{t('By')}</Th>
              <Th className="text-right">{t('Amount')}</Th>
            </tr>
          </THead>
          <TBody>
            {data.entries.length === 0 ? (
              <EmptyRow colSpan={5}>{t('No cash movements.')}</EmptyRow>
            ) : (
              data.entries.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(e.createdAt)}</Td>
                  <Td>
                    {t(MOVEMENT_LABELS[e.type])}
                    {!e.inExpectedCash && (
                      <Badge variant="default" className="ml-1" title={t('Trace only: cash sales are counted from the payments')}>
                        {t('not in expected')}
                      </Badge>
                    )}
                  </Td>
                  <Td className="max-w-xs truncate">{[e.reference, e.reason].filter(Boolean).join(' · ') || '—'}</Td>
                  <Td>{e.userName ?? '—'}</Td>
                  <Td
                    className={cn(
                      'text-right tabular-nums',
                      e.direction === 'in' ? 'text-green-700' : e.direction === 'none' ? 'text-gray-500' : 'text-gray-900'
                    )}
                  >
                    {e.direction === 'none' ? '—' : `${e.direction === 'in' ? '+' : '−'}${money(e.amount)}`}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
