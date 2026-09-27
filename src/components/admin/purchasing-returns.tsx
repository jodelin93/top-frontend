'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import {
  DataCardField,
  DataCardFields,
  DataCardHeader,
  DataCards,
  useSmallScreen,
} from '@/components/ui/data-cards';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { goodsReceiptsApi, SupplierReturnInput, supplierReturnsApi } from '@/lib/api/purchasing';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { plural, t } from '@/i18n';
import { addQty, QUANTITY_TEXT } from '@/lib/pos/quantity';

/**
 * Goods sent back to suppliers. Each return removes the units from stock and
 * creates a supplier credit.
 */
export function SupplierReturnsTab() {
  const canManage = hasPermission(
    useAuthStore((s) => s.user),
    'purchasing.manage'
  );
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: returns = [], isLoading, error } = useQuery({
    queryKey: ['supplier-returns', supplierId],
    queryFn: () => supplierReturnsApi.list({ supplierId: supplierId || undefined }),
  });

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 lg:flex-row lg:items-center">
        <Select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="lg:w-60"
          aria-label={t('Filter by supplier')}
        >
          <option value="">{t('All suppliers')}</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        {canManage && (
          <Button
            onClick={() => setCreating(true)}
            disabled={suppliers.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t('New return')}
          </Button>
        )}
      </div>
      {notice && <div className="m-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load supplier returns')}</ErrorMessage>
        </div>
      )}
      {smallScreen ? (
        // Phones: one card per return instead of a table that scrolls sideways
        <DataCards
          items={returns}
          getKey={(r) => r.id}
          loading={isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No supplier returns yet.')}
        >
          {(r) => (
            <>
              <DataCardHeader
                title={<span className="font-mono text-xs">{r.returnNumber}</span>}
                subtitle={r.supplier?.name ?? '—'}
                badge={<span className="font-medium">{formatMoney(r.totalAmount, r.currencyCode)}</span>}
              />
              <DataCardFields>
                <DataCardField label={t('Date')}>{formatDateTime(r.returnedAt)}</DataCardField>
                <DataCardField label={t('Receipt')}>
                  <span className="font-mono text-xs">{r.receipt?.receiptNumber ?? '—'}</span>
                </DataCardField>
                <DataCardField label={t('Units')}>{addQty(...r.items.map((i) => Number(i.quantity)))}</DataCardField>
                <DataCardField label={t('Reason')} full>
                  {r.reason}
                  {r.reference && (
                    <div className="text-xs text-gray-500">{t('RMA {reference}', { reference: r.reference })}</div>
                  )}
                </DataCardField>
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Return')}</Th>
            <Th>{t('Supplier')}</Th>
            <Th>{t('Receipt')}</Th>
            <Th>{t('Date')}</Th>
            <Th>{t('Reason')}</Th>
            <Th className="text-right">{t('Units')}</Th>
            <Th className="text-right">{t('Credit')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={7}>{t('Loading...')}</EmptyRow>
          ) : returns.length === 0 ? (
            <EmptyRow colSpan={7}>{t('No supplier returns yet.')}</EmptyRow>
          ) : (
            returns.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono text-xs font-medium">{r.returnNumber}</Td>
                <Td>{r.supplier?.name ?? '—'}</Td>
                <Td className="font-mono text-xs">{r.receipt?.receiptNumber ?? '—'}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(r.returnedAt)}</Td>
                <Td className="text-gray-600">
                  {r.reason}
                  {r.reference && <div className="text-xs">{t('RMA {reference}', { reference: r.reference })}</div>}
                </Td>
                <Td className="text-right">{addQty(...r.items.map((i) => Number(i.quantity)))}</Td>
                <Td className="text-right">{formatMoney(r.totalAmount, r.currencyCode)}</Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}
      {creating && (
        <SupplierReturnDialog
          initialSupplierId={supplierId}
          onClose={() => setCreating(false)}
          onDone={(message) => {
            setCreating(false);
            setNotice(message);
          }}
        />
      )}
    </Card>
  );
}

function SupplierReturnDialog({
  initialSupplierId,
  onClose,
  onDone,
}: {
  initialSupplierId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const storeCurrency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [receiptId, setReceiptId] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['goods-receipts', supplierId],
    queryFn: () => goodsReceiptsApi.list({ supplierId }),
    enabled: !!supplierId,
  });
  // Receipts with something that can still go back
  const returnable = receipts.filter((r) => r.items.some((i) => i.returnable > 0));
  const receipt = receipts.find((r) => r.id === receiptId);
  const currency =
    receipt?.purchaseOrder?.currencyCode ?? suppliers.find((s) => s.id === supplierId)?.currencyCode ?? storeCurrency;

  const create = useMutation({
    mutationFn: (input: SupplierReturnInput) => supplierReturnsApi.create(input),
    onSuccess: async (created) => {
      for (const key of ['supplier-returns', 'goods-receipts', 'supplier-credits', 'payables', 'inventory']) {
        await queryClient.invalidateQueries({ queryKey: [key] });
      }
      onDone(
        t('Return {number} recorded: stock was reduced and a supplier credit of {amount} was created.', {
          number: created.returnNumber,
          amount: formatMoney(created.totalAmount, created.currencyCode),
        })
      );
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not record the return')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!receipt) return setError(t('Choose the receipt the goods came in on.'));
    if (!reason.trim()) return setError(t('A reason is required.'));
    const items: SupplierReturnInput['items'] = [];
    for (const item of receipt.items) {
      const raw = (quantities[item.id] ?? '').trim().replace(',', '.');
      if (!raw || Number(raw) === 0) continue;
      if (!QUANTITY_TEXT.test(raw)) {
        return setError(t('Enter a quantity of 0 or more (up to 4 decimals) for {sku}.', { sku: item.sku }));
      }
      if (Number(raw) > item.returnable) {
        return setError(t('Only {count} unit(s) of {sku} can still be returned.', { count: item.returnable, sku: item.sku }));
      }
      items.push({ receiptItemId: item.id, quantity: Number(raw) });
    }
    if (items.length === 0) return setError(t('Enter at least one quantity to return.'));
    create.mutate({
      receiptId: receipt.id,
      reason: reason.trim(),
      items,
      ...(reference.trim() && { reference: reference.trim() }),
    });
  };

  // How many of a received line go back; shared by the table and the phone cards
  const returnInput = (item: NonNullable<typeof receipt>['items'][number], className?: string) => (
    <Input
      inputMode="numeric"
      placeholder="0"
      disabled={item.returnable === 0}
      value={quantities[item.id] ?? ''}
      onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
      className={className}
      aria-label={t('Quantity to return for {sku}', { sku: item.sku })}
    />
  );
  const itemDetails = (item: NonNullable<typeof receipt>['items'][number]) => (
    <>
      <div className="font-medium">{item.productName}</div>
      <div className="font-mono text-xs text-gray-500">
        {item.sku}
        {item.condition === 'damaged' &&
          ` · ${item.accepted ? t('damaged, accepted') : t('damaged, rejected (not in stock)')}`}
      </div>
    </>
  );

  const total = (receipt?.items ?? []).reduce(
    (sum, i) => sum + (Number(quantities[i.id]) || 0) * Number(i.unitCost),
    0
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Return goods to a supplier')}</DialogTitle>
          <DialogDescription>
            {t('The units leave stock at the receipt’s location and the supplier owes you their value (supplier credit).')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Supplier')} htmlFor="ret-supplier">
              <Select
                id="ret-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setReceiptId('');
                  setQuantities({});
                }}
              >
                <option value="">{t('Choose a supplier...')}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Receipt')} htmlFor="ret-receipt">
              <Select
                id="ret-receipt"
                value={receiptId}
                disabled={!supplierId || isLoading}
                onChange={(e) => {
                  setReceiptId(e.target.value);
                  setQuantities({});
                }}
              >
                <option value="">
                  {isLoading
                    ? t('Loading...')
                    : returnable.length === 0
                      ? t('No receipt with returnable goods')
                      : t('Choose a receipt...')}
                </option>
                {returnable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.receiptNumber} · {formatDate(r.receivedAt)}
                    {r.purchaseOrder ? ` · ${r.purchaseOrder.poNumber}` : ` · ${t('unplanned')}`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {receipt && smallScreen && (
            // Phones: one card per received line, the quantity box in view
            <div className="space-y-2">
              {receipt.items.map((item) => (
                <div
                  key={item.id}
                  className={`space-y-2 rounded-md border p-3 text-sm ${item.returnable === 0 ? 'text-gray-400' : ''}`}
                >
                  <div className="break-words">{itemDetails(item)}</div>
                  <div className="flex justify-between gap-2 text-xs text-gray-600">
                    <span>
                      {t('Received')}: {item.quantity}
                    </span>
                    <span>
                      {t('Can return')}: {item.returnable}
                    </span>
                    <span>
                      {t('Unit cost')}: {formatMoney(item.unitCost, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{t('Return')}</span>
                    {returnInput(item, 'h-10 w-24')}
                  </div>
                </div>
              ))}
            </div>
          )}
          {receipt && !smallScreen && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Product')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Received')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Can return')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Unit cost')}</th>
                    <th className="w-28 px-3 py-2 font-medium">{t('Return')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receipt.items.map((item) => (
                    <tr key={item.id} className={item.returnable === 0 ? 'text-gray-400' : ''}>
                      <td className="px-3 py-2">{itemDetails(item)}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{item.returnable}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.unitCost, currency)}</td>
                      <td className="px-3 py-2">
                        {returnInput(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Reason')} htmlFor="ret-reason" className="sm:col-span-2">
              <Input id="ret-reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Field label={t('Return authorisation (RMA)')} htmlFor="ret-reference">
              <Input id="ret-reference" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
          </div>
          {receipt && (
            <p className="text-sm text-gray-600">
              {plural(
                Object.values(quantities).reduce((sum, v) => sum + (Number(v) || 0), 0),
                '{count} unit to return',
                '{count} units to return'
              )}{' '}
              · {t('Credit {amount}', { amount: formatMoney(Math.round(total * 100) / 100, currency) })}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={create.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
              {create.isPending ? t('Saving...') : t('Record return')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
