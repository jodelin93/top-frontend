'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { ErrorMessage } from '@/components/admin/page-header';
import { CustomerMergeDialog } from '@/components/admin/customer-merge-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { Customer, customerName, customersApi, DuplicatePair, DuplicateReason } from '@/lib/api/customers';
import { t } from '@/i18n';

// English labels, translated at render
export const SAME_REASON_LABELS: Record<DuplicateReason, string> = {
  email: 'same email',
  phone: 'same phone',
  name: 'same name',
};

function Who({ customer }: { customer: Customer }) {
  return (
    <div>
      <div className="font-medium">{customerName(customer)}</div>
      <div className="text-xs text-gray-500">
        <span className="font-mono">{customer.code}</span>
        {customer.email ? ` · ${customer.email}` : ''}
        {customer.phone ? ` · ${customer.phone}` : ''}
      </div>
    </div>
  );
}

/** Likely duplicate customers to review and merge */
export function CustomerDuplicatesSection() {
  const [merging, setMerging] = useState<DuplicatePair | null>(null);
  const { data: pairs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['customer-duplicates'],
    queryFn: () => customersApi.duplicates(100),
  });

  return (
    <Card className="bg-white">
      <div className="border-b p-4 text-sm text-gray-600">
        {t(
          'Customers with the same email or phone number, or a very similar name. Merging keeps one record, moves the purchase history, adds up loyalty points and balances, and keeps both consent histories. The other record is retired, and the merge is recorded in the audit log.'
        )}
      </div>
      {error && (
        <div className="p-4 pb-0">
          <ErrorMessage>{getErrorMessage(error, 'Could not load duplicates')}</ErrorMessage>
        </div>
      )}
      <Table>
        <THead>
          <tr>
            <Th>{t('Customer')}</Th>
            <Th>{t('Possible duplicate')}</Th>
            <Th>{t('Why')}</Th>
            <Th />
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={4}>{t('Looking for duplicates...')}</EmptyRow>
          ) : pairs.length === 0 ? (
            <EmptyRow colSpan={4}>{t('No likely duplicates found.')}</EmptyRow>
          ) : (
            pairs.map((pair) => (
              <tr key={`${pair.a.id}-${pair.b.id}`}>
                <Td>
                  <Who customer={pair.a} />
                </Td>
                <Td>
                  <Who customer={pair.b} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {pair.reasons.map((reason) => (
                      <Badge key={reason} variant={reason === 'name' ? 'warning' : 'info'}>
                        {t(SAME_REASON_LABELS[reason] ?? reason)}
                      </Badge>
                    ))}
                    {pair.reasons.length === 1 && pair.reasons[0] === 'name' && pair.score < 1 && (
                      <span className="text-xs text-gray-500">{t('{percent}% similar', { percent: Math.round(pair.score * 100) })}</span>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setMerging(pair)}>
                      <GitMerge className="h-4 w-4" />
                      {t('Review & merge')}
                    </Button>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>

      <CustomerMergeDialog
        key={merging ? `${merging.a.id}-${merging.b.id}` : 'closed'}
        pair={merging}
        onClose={() => setMerging(null)}
        onMerged={() => {
          setMerging(null);
          void refetch();
        }}
      />
    </Card>
  );
}
