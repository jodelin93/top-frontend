'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardActions,
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import { ErrorMessage, PageHeader } from '@/components/admin/page-header';
import { DiscountFormDialog } from '@/components/admin/discount-form-dialog';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { Discount, DiscountType, discountsApi } from '@/lib/api/discounts';
import { formatDate, formatMoney } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { plural, t } from '@/i18n';

const typeLabels: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
  buy_x_get_y: 'Buy X get Y',
};

const statusLabels: Record<Discount['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  scheduled: 'Scheduled',
  expired: 'Expired',
};

function discountValue(discount: Discount, currency: string): string {
  switch (discount.discountType) {
    case 'percentage':
      return `${Number(discount.percentage ?? 0)}%`;
    case 'fixed_amount':
      return formatMoney(discount.value, currency);
    case 'buy_x_get_y':
      return t('Buy {buy} get {get}', { buy: discount.buyQuantity ?? '?', get: discount.getQuantity ?? '?' });
  }
}

function discountScope(discount: Discount): string {
  switch (discount.scope) {
    case 'cart':
      return t('Whole cart');
    case 'product': {
      const n = discount.applicableProductIds?.length ?? 0;
      return plural(n, '{count} product', '{count} products');
    }
    case 'category': {
      const n = discount.applicableCategoryIds?.length ?? 0;
      return plural(n, '{count} category', '{count} categories');
    }
  }
}

function validity(discount: Discount): string {
  const { validFrom, validTo } = discount;
  if (validFrom && validTo) return `${formatDate(validFrom)} – ${formatDate(validTo)}`;
  if (validFrom) return t('From {date}', { date: formatDate(validFrom) });
  if (validTo) return t('Until {date}', { date: formatDate(validTo) });
  return t('Always');
}

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: discounts = [], isLoading, error } = useQuery({
    queryKey: ['discounts'],
    queryFn: () => discountsApi.list(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => discountsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (discount: Discount) => {
    setEditing(discount);
    setDialogOpen(true);
  };

  const handleDelete = async (discount: Discount) => {
    if (!window.confirm(t('Delete discount "{code}"?', { code: discount.code }))) return;
    setActionError(null);
    try {
      await remove.mutateAsync(discount.id);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Could not delete discount'));
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title={t('Discounts')}
        description={t('Promotions and discount codes applied at the POS.')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('New discount')}
          </Button>
        }
      />

      <Card className="bg-white">
        {(error || actionError) && (
          <div className="m-4">
            <ErrorMessage>
              {actionError ?? getErrorMessage(error, 'Could not load discounts')}
            </ErrorMessage>
          </div>
        )}

        {smallScreen ? (
          // Phones: one card per discount instead of a table that scrolls sideways
          <DataCards
            items={discounts}
            getKey={(discount) => discount.id}
            loading={isLoading}
            loadingText={t('Loading discounts...')}
            emptyText={t('No discounts yet. Create your first one.')}
          >
            {(discount) => (
              <>
                <DataCardHeader
                  title={text(discount.name, '—')}
                  subtitle={<span className="font-mono">{discount.code}</span>}
                  badge={
                    <Badge variant={statusVariant(discount.status)}>{t(statusLabels[discount.status] ?? discount.status)}</Badge>
                  }
                />
                <DataCardFields>
                  <DataCardField label={t('Value')}>{discountValue(discount, currency)}</DataCardField>
                  <DataCardField label={t('Type')}>{t(typeLabels[discount.discountType])}</DataCardField>
                  <DataCardField label={t('Applies to')}>{discountScope(discount)}</DataCardField>
                  <DataCardField label={t('Usage')}>
                    {discount.usageCount} / {discount.usageLimit ?? '∞'}
                  </DataCardField>
                  <DataCardField label={t('Valid')} full>
                    {validity(discount)}
                  </DataCardField>
                </DataCardFields>
                <DataCardActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(discount)}
                    aria-label={t('Edit {code}', { code: discount.code })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(discount)}
                    disabled={remove.isPending}
                    aria-label={t('Delete {code}', { code: discount.code })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DataCardActions>
              </>
            )}
          </DataCards>
        ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Code')}</Th>
              <Th>{t('Name')}</Th>
              <Th>{t('Type')}</Th>
              <Th>{t('Applies to')}</Th>
              <Th>{t('Value')}</Th>
              <Th>{t('Usage')}</Th>
              <Th>{t('Valid')}</Th>
              <Th>{t('Status')}</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={9}>{t('Loading discounts...')}</EmptyRow>
            ) : discounts.length === 0 ? (
              <EmptyRow colSpan={9}>{t('No discounts yet. Create your first one.')}</EmptyRow>
            ) : (
              discounts.map((discount) => (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <Td className="font-mono text-xs">{discount.code}</Td>
                  <Td className="font-medium">{text(discount.name, '—')}</Td>
                  <Td>{t(typeLabels[discount.discountType])}</Td>
                  <Td>{discountScope(discount)}</Td>
                  <Td className="whitespace-nowrap">{discountValue(discount, currency)}</Td>
                  <Td className="whitespace-nowrap">
                    {discount.usageCount} / {discount.usageLimit ?? '∞'}
                  </Td>
                  <Td className="whitespace-nowrap text-xs">{validity(discount)}</Td>
                  <Td>
                    <Badge variant={statusVariant(discount.status)}>{t(statusLabels[discount.status] ?? discount.status)}</Badge>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(discount)}
                        aria-label={t('Edit {code}', { code: discount.code })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(discount)}
                        disabled={remove.isPending}
                        aria-label={t('Delete {code}', { code: discount.code })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        )}
      </Card>

      <DiscountFormDialog open={dialogOpen} onOpenChange={setDialogOpen} discount={editing} />
    </div>
  );
}
