'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useLocationOptions } from '@/components/admin/settings-shared';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { purchaseOrdersApi, ReorderGroup, reorderApi } from '@/lib/api/purchasing';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Products at or below their reorder point (counting what is already on order),
 * grouped by preferred supplier; each group becomes a draft purchase order in
 * one click.
 */
export function ReorderSuggestionsTab({ onOrderCreated }: { onOrderCreated: (poNumber: string) => void }) {
  const { options: locations } = useLocationOptions();
  const [locationId, setLocationId] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reorder-suggestions', locationId],
    queryFn: () => reorderApi.suggestions({ locationId: locationId || undefined }),
  });
  const groups = data?.groups ?? [];

  return (
    <div className="space-y-4">
      <Card className="bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label={t('Stock at')} htmlFor="reorder-location">
            <Select id="reorder-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">{t('All locations')}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="flex-1 text-sm text-gray-500">
            {t(
              'Suggested quantity: the product’s reorder quantity, else enough to reach its maximum stock level, at least the supplier’s minimum order. Set reorder points on products and preferred suppliers under Suppliers → Products.'
            )}
          </p>
        </div>
      </Card>
      {error && <ErrorMessage>{getErrorMessage(error, 'Could not load reorder suggestions')}</ErrorMessage>}
      {isLoading ? (
        <Card className="bg-white p-6 text-center text-sm text-gray-400">{t('Loading...')}</Card>
      ) : groups.length === 0 ? (
        <Card className="bg-white p-6 text-center text-sm text-gray-500">
          {t('Nothing needs reordering: every product with a reorder point has enough stock or is already on order.')}
        </Card>
      ) : (
        groups.map((group) => (
          <ReorderGroupCard
            key={group.supplier?.id ?? 'none'}
            group={group}
            defaultLocationId={locationId || (locations.find((l) => !l.isSellable)?.id ?? locations[0]?.id ?? '')}
            onCreated={async (poNumber) => {
              onOrderCreated(poNumber);
              await refetch();
            }}
          />
        ))
      )}
    </div>
  );
}

function ReorderGroupCard({
  group,
  defaultLocationId,
  onCreated,
}: {
  group: ReorderGroup;
  defaultLocationId: string;
  onCreated: (poNumber: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const storeCurrency = useCurrency();
  const { options: locations } = useLocationOptions();
  const currency = group.supplier?.currencyCode ?? storeCurrency;
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(group.lines.map((l) => [l.variantId, String(l.suggestedQuantity)]))
  );
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!group.supplier) throw new Error(t('Choose a supplier for these products first.'));
      if (!locationId) throw new Error(t('Choose where the goods will be received.'));
      const items = [];
      for (const line of group.lines) {
        const raw = (quantities[line.variantId] ?? '').trim();
        if (!raw || raw === '0') continue;
        if (!/^\d+$/.test(raw)) throw new Error(t('Enter a whole quantity for {sku}.', { sku: line.sku }));
        items.push({
          variantId: line.variantId,
          quantityOrdered: Number(raw),
          unitCost: line.unitCost ?? 0,
          ...(line.supplierSku && { supplierSku: line.supplierSku }),
        });
      }
      if (items.length === 0) throw new Error(t('Enter at least one quantity to order.'));
      return purchaseOrdersApi.create({
        supplierId: group.supplier.id,
        locationId,
        expectedDeliveryDate: group.supplier.leadTimeDays != null ? addDaysIso(group.supplier.leadTimeDays) : null,
        notes: t('Created from reorder suggestions'),
        items,
      });
    },
    onMutate: () => setError(null),
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await onCreated(order.poNumber);
    },
    onError: (err) =>
      setError(err instanceof Error && !('response' in err) ? err.message : getErrorMessage(err, 'Could not create the order')),
  });

  const total = group.lines.reduce(
    (sum, l) => sum + (Number(quantities[l.variantId]) || 0) * (l.unitCost ?? 0),
    0
  );

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="font-semibold">{group.supplier ? group.supplier.name : t('No supplier yet')}</div>
          <div className="text-xs text-gray-500">
            {group.supplier
              ? group.supplier.leadTimeDays != null
                ? t('Lead time {count} d', { count: group.supplier.leadTimeDays })
                : group.supplier.code
              : t('Add these products to a supplier (Suppliers → Products) to order them from here.')}
          </div>
        </div>
        {group.supplier && (
          <>
            <Select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="lg:w-64"
              aria-label={t('Deliver to')}
            >
              <option value="">{t('Choose a location...')}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
            <Button
              disabled={create.isPending}
              onClick={() => create.mutate()}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <FilePlus className="h-4 w-4" />
              {create.isPending ? t('Creating...') : t('Create draft PO')}
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">{t('Product')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('On hand')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('On order')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('Reorder point')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('Unit cost')}</th>
              <th className="w-28 px-3 py-2 font-medium">{t('Order')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {group.lines.map((line) => (
              <tr key={line.variantId}>
                <td className="px-4 py-2">
                  <div className="font-medium">{line.productName}</div>
                  <div className="font-mono text-xs text-gray-500">
                    {line.sku}
                    {line.supplierSku && ` · ${line.supplierSku}`}
                    {line.minOrderQty && ` · ${t('min. {count}', { count: line.minOrderQty })}`}
                  </div>
                </td>
                <td className="px-3 py-2 text-right">{line.onHand}</td>
                <td className="px-3 py-2 text-right">{line.onOrder}</td>
                <td className="px-3 py-2 text-right">{line.reorderPoint}</td>
                <td className="px-3 py-2 text-right">
                  {line.unitCost != null ? formatMoney(line.unitCost, currency) : '—'}
                </td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="numeric"
                    value={quantities[line.variantId] ?? ''}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [line.variantId]: e.target.value }))}
                    aria-label={t('Quantity to order for {sku}', { sku: line.sku })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-2 text-right text-sm text-gray-600">
        {t('Estimated total {amount}', { amount: formatMoney(Math.round(total * 100) / 100, currency) })}
      </div>
    </Card>
  );
}
