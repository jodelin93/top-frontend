'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSmallScreen } from '@/components/ui/data-cards';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useLocationOptions } from '@/components/admin/settings-shared';
import { variantLabel, VariantPicker } from '@/components/admin/inventory-variant-picker';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { PurchaseOrderDetail, PurchaseOrderInput, purchaseOrdersApi, supplierProductsApi } from '@/lib/api/purchasing';
import { formatMoney, addDaysLocalIso } from '@/lib/format';
import { t } from '@/i18n';
import { QUANTITY_TEXT } from '@/lib/pos/quantity';

interface OrderLine {
  variantId: string;
  label: string;
  sku: string;
  quantity: string;
  unitCost: string;
  discountPercent: string;
  taxAmount: string;
  unitOfMeasure: string;
  supplierSku: string;
  // Already received (a revision cannot order less)
  received: number;
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// quantity × cost − discount + tax (display only: the server computes the exact totals)
const lineNet = (line: OrderLine) => {
  const gross = round2((Number(line.quantity) || 0) * (Number(line.unitCost) || 0));
  return round2(gross - round2((gross * (Number(line.discountPercent) || 0)) / 100));
};

const addDaysIso = (days: number) => addDaysLocalIso(days);

/**
 * Create or edit a draft purchase order. An order past approval (approved,
 * issued, partly received) is changed as a revision: a reason is required and,
 * above the approval threshold, it goes back for approval.
 */
export function PurchaseOrderFormDialog({
  order,
  onClose,
  onSaved,
}: {
  order: PurchaseOrderDetail | null;
  onClose: () => void;
  onSaved: (order: PurchaseOrderDetail) => void;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const { options: locations } = useLocationOptions();
  const isRevision = !!order && order.status !== 'draft';
  const hasReceipts = !!order?.items.some((i) => i.quantityReceived > 0);
  const [supplierId, setSupplierId] = useState(order?.supplierId ?? '');
  const [supplierReference, setSupplierReference] = useState(order?.supplierReference ?? '');
  const [reason, setReason] = useState('');
  const [locationId, setLocationId] = useState(
    order?.locationId ?? locations.find((l) => !l.isSellable)?.id ?? locations[0]?.id ?? ''
  );
  const [expected, setExpected] = useState(order?.expectedDeliveryDate?.slice(0, 10) ?? '');
  // A new or changed expected delivery date can't already be over
  const expectedError =
    expected && expected !== (order?.expectedDeliveryDate?.slice(0, 10) ?? '') && expected < addDaysLocalIso(0)
      ? t('The expected delivery date cannot be in the past')
      : undefined;
  const [shipping, setShipping] = useState(order?.shippingCost ? String(order.shippingCost) : '');
  // Order-level tax: the order's tax minus what its lines carry
  const lineTaxTotal = round2((order?.items ?? []).reduce((sum, i) => sum + Number(i.taxAmount ?? 0), 0));
  const [tax, setTax] = useState(
    order && round2(order.taxAmount - lineTaxTotal) > 0 ? String(round2(order.taxAmount - lineTaxTotal)) : ''
  );
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [lines, setLines] = useState<OrderLine[]>(
    (order?.items ?? []).map((item) => ({
      variantId: item.variantId,
      label: item.productName,
      sku: item.sku,
      quantity: String(item.quantityOrdered),
      unitCost: String(item.unitCost),
      discountPercent: Number(item.discountPercent ?? 0) ? String(item.discountPercent) : '',
      taxAmount: Number(item.taxAmount ?? 0) ? String(item.taxAmount) : '',
      unitOfMeasure: item.unitOfMeasure ?? '',
      supplierSku: item.supplierSku ?? '',
      received: item.quantityReceived,
    }))
  );
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  // The supplier's codes, last costs and minimums prefill new lines
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: () => supplierProductsApi.list(supplierId),
    enabled: !!supplierId,
  });
  const supplierProduct = (variantId: string) => supplierProducts.find((p) => p.variantId === variantId);

  const chooseSupplier = (id: string) => {
    setSupplierId(id);
    // Expected delivery from the supplier's lead time, unless already chosen
    const lead = suppliers.find((s) => s.id === id)?.leadTimeDays;
    if (!expected && lead != null) setExpected(addDaysIso(lead));
  };

  const save = useMutation({
    mutationFn: (input: PurchaseOrderInput) =>
      !order
        ? purchaseOrdersApi.create(input)
        : isRevision
          ? purchaseOrdersApi.revise(order.id, { ...input, reason: reason.trim() })
          : purchaseOrdersApi.update(order.id, input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      onSaved(saved);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the purchase order')),
  });

  const update = (variantId: string, patch: Partial<OrderLine>) =>
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)));

  // Line controls, shared by the table (desktop) and the cards (phones)
  type TextKey = 'supplierSku' | 'quantity' | 'unitOfMeasure' | 'unitCost' | 'discountPercent' | 'taxAmount';
  const lineInput = (line: OrderLine, key: TextKey, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Input {...props} value={line[key]} onChange={(e) => update(line.variantId, { [key]: e.target.value })} aria-label={label} />
  );
  const supplierSkuInput = (line: OrderLine, className: string) =>
    lineInput(line, 'supplierSku', t('Supplier code for {sku}', { sku: line.sku }), {
      className,
      placeholder: t('Supplier code'),
    });
  const quantityInput = (line: OrderLine, className?: string) =>
    lineInput(line, 'quantity', t('Quantity for {sku}', { sku: line.sku }), {
      inputMode: 'numeric',
      className,
    });
  const unitInput = (line: OrderLine, className?: string) =>
    lineInput(line, 'unitOfMeasure', t('Unit of measure for {sku}', { sku: line.sku }), {
      placeholder: t('each'),
      maxLength: 30,
      className,
    });
  const unitCostInput = (line: OrderLine, className?: string) =>
    lineInput(line, 'unitCost', t('Unit cost for {sku}', { sku: line.sku }), {
      inputMode: 'decimal',
      className,
    });
  const discountInput = (line: OrderLine, className?: string) =>
    lineInput(line, 'discountPercent', t('Discount % for {sku}', { sku: line.sku }), {
      inputMode: 'decimal',
      placeholder: '0',
      className,
    });
  const taxInput = (line: OrderLine, className?: string) =>
    lineInput(line, 'taxAmount', t('Tax for {sku}', { sku: line.sku }), {
      inputMode: 'decimal',
      placeholder: '0.00',
      className,
    });
  const lineTotal = (line: OrderLine) => formatMoney(round2(lineNet(line) + (Number(line.taxAmount) || 0)), currency);
  const removeButton = (line: OrderLine) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-red-600"
      disabled={line.received > 0}
      aria-label={t('Remove {sku}', { sku: line.sku })}
      onClick={() => setLines((prev) => prev.filter((l) => l.variantId !== line.variantId))}
    >
      <X className="h-4 w-4" />
    </Button>
  );

  const subtotal = round2(lines.reduce((sum, l) => sum + lineNet(l), 0));
  const allTax = round2(lines.reduce((sum, l) => sum + (Number(l.taxAmount) || 0), 0) + (Number(tax) || 0));
  const total = round2(subtotal + allTax + (Number(shipping) || 0));
  const activeSuppliers = suppliers.filter((s) => s.status === 'active' || s.id === supplierId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError(t('Choose a supplier.'));
    if (!locationId) return setError(t('Choose where the goods will be received.'));
    if (lines.length === 0) return setError(t('Add at least one product.'));
    if (expectedError) return setError(expectedError);
    if (isRevision && !reason.trim()) return setError(t('Say why the order is being revised.'));
    const items: PurchaseOrderInput['items'] = [];
    for (const line of lines) {
      // Decimals for measured items (kg, m, l); the server checks each unit's precision
      if (!QUANTITY_TEXT.test(line.quantity.trim()) || Number(line.quantity) <= 0) {
        return setError(t('Enter a quantity above 0 (up to 4 decimals) for {sku}.', { sku: line.sku }));
      }
      if (Number(line.quantity) < line.received) {
        return setError(
          t('{count} unit(s) of {sku} were already received; order at least that many.', {
            count: line.received,
            sku: line.sku,
          })
        );
      }
      const cost = Number(line.unitCost);
      if (line.unitCost.trim() === '' || isNaN(cost) || cost < 0) {
        return setError(t('Enter a unit cost for {sku}.', { sku: line.sku }));
      }
      const discount = Number(line.discountPercent || 0);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return setError(t('The discount for {sku} must be between 0 and 100%.', { sku: line.sku }));
      }
      const lineTax = Number(line.taxAmount || 0);
      if (isNaN(lineTax) || lineTax < 0) {
        return setError(t('Enter a valid tax amount for {sku}.', { sku: line.sku }));
      }
      items.push({
        variantId: line.variantId,
        quantityOrdered: Number(line.quantity),
        unitCost: cost,
        ...(discount > 0 && { discountPercent: discount }),
        ...(lineTax > 0 && { taxAmount: lineTax }),
        unitOfMeasure: line.unitOfMeasure.trim() || null,
        supplierSku: line.supplierSku.trim() || null,
      });
    }
    for (const [label, value] of [
      ['Tax', tax],
      ['Shipping', shipping],
    ]) {
      if (value.trim() && (isNaN(Number(value)) || Number(value) < 0))
        return setError(t('{label} must be a positive amount.', { label: t(label) }));
    }
    save.mutate({
      supplierId,
      locationId,
      expectedDeliveryDate: expected || null,
      taxAmount: Number(tax) || 0,
      shippingCost: Number(shipping) || 0,
      notes: notes.trim() || null,
      supplierReference: supplierReference.trim() || null,
      items,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isRevision
              ? t('Revise {number}', { number: order.poNumber })
              : order
                ? t('Edit {number}', { number: order.poNumber })
                : t('New purchase order')}
          </DialogTitle>
          <DialogDescription>
            {isRevision
              ? t(
                  'The change is recorded as a revision (before and after). If the new total is above the approval threshold, the order goes back for approval.'
                )
              : t('Saved as a draft. Submit it when it is ready for approval.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Supplier')} htmlFor="po-supplier">
              <Select
                id="po-supplier"
                value={supplierId}
                disabled={isRevision}
                onChange={(e) => chooseSupplier(e.target.value)}
              >
                <option value="">{t('Choose a supplier...')}</option>
                {activeSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Deliver to')} htmlFor="po-location">
              <Select
                id="po-location"
                value={locationId}
                disabled={isRevision && hasReceipts}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Expected delivery')} htmlFor="po-expected" error={expectedError}>
              <Input
                id="po-expected"
                type="date"
                min={addDaysLocalIso(0)}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </Field>
          </div>

          <VariantPicker
            excludeIds={new Set(lines.map((l) => l.variantId))}
            renderAction={(product, variant) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const known = supplierProduct(variant.id);
                  const cost = known?.lastCost ?? variant.cost;
                  setLines((prev) => [
                    ...prev,
                    {
                      variantId: variant.id,
                      label: variantLabel(product, variant),
                      sku: variant.sku,
                      quantity: String(known?.minOrderQty ?? 1),
                      unitCost: cost != null ? String(cost) : '',
                      discountPercent: '',
                      taxAmount: '',
                      unitOfMeasure: '',
                      supplierSku: known?.supplierSku ?? '',
                      received: 0,
                    },
                  ]);
                }}
              >
                <Plus className="h-3 w-3" />
                {t('Add')}
              </Button>
            )}
          />

          {lines.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-gray-400">
              {t('No products added yet. Search above and click Add.')}
            </p>
          ) : smallScreen ? (
            // Phones: one card per line, every box in view (the table scrolls sideways)
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.variantId} className="space-y-2 rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-medium">{line.label}</div>
                      <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                      {line.received > 0 && (
                        <div className="text-xs text-gray-500">{t('{count} received', { count: line.received })}</div>
                      )}
                    </div>
                    {removeButton(line)}
                  </div>
                  {supplierSkuInput(line, 'h-10 w-full')}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Quantity')}</span>
                      {quantityInput(line, 'h-10 w-full')}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Unit')}</span>
                      {unitInput(line, 'h-10 w-full')}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Unit cost')}</span>
                      {unitCostInput(line, 'h-10 w-full')}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Disc. %')}</span>
                      {discountInput(line, 'h-10 w-full')}
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">{t('Tax')}</span>
                      {taxInput(line, 'h-10 w-full')}
                    </label>
                    <div className="space-y-1 text-right">
                      <div className="text-xs text-gray-500">{t('Line total')}</div>
                      <div className="flex h-10 items-center justify-end font-medium">{lineTotal(line)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Product')}</th>
                    <th className="w-20 px-2 py-2 font-medium">{t('Quantity')}</th>
                    <th className="w-24 px-2 py-2 font-medium">{t('Unit')}</th>
                    <th className="w-24 px-2 py-2 font-medium">{t('Unit cost')}</th>
                    <th className="w-20 px-2 py-2 font-medium">{t('Disc. %')}</th>
                    <th className="w-24 px-2 py-2 font-medium">{t('Tax')}</th>
                    <th className="w-24 px-2 py-2 text-right font-medium">{t('Line total')}</th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lines.map((line) => (
                    <tr key={line.variantId}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{line.label}</div>
                        <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                        {supplierSkuInput(line, 'mt-1 h-7 text-xs')}
                        {line.received > 0 && (
                          <div className="text-xs text-gray-500">{t('{count} received', { count: line.received })}</div>
                        )}
                      </td>
                      <td className="px-2 py-2">{quantityInput(line)}</td>
                      <td className="px-2 py-2">{unitInput(line)}</td>
                      <td className="px-2 py-2">{unitCostInput(line)}</td>
                      <td className="px-2 py-2">{discountInput(line)}</td>
                      <td className="px-2 py-2">{taxInput(line)}</td>
                      <td className="px-2 py-2 text-right">{lineTotal(line)}</td>
                      <td className="px-2 py-2">{removeButton(line)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Order tax')} htmlFor="po-tax" hint={t('In addition to the line taxes')}>
              <Input
                id="po-tax"
                inputMode="decimal"
                placeholder="0.00"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </Field>
            <Field label={t('Shipping')} htmlFor="po-shipping">
              <Input
                id="po-shipping"
                inputMode="decimal"
                placeholder="0.00"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
              />
            </Field>
            <div className="flex flex-col justify-end text-right text-sm">
              <span className="text-gray-500">{t('Subtotal {amount}', { amount: formatMoney(subtotal, currency) })}</span>
              {allTax > 0 && (
                <span className="text-gray-500">{t('Tax {amount}', { amount: formatMoney(allTax, currency) })}</span>
              )}
              <span className="text-lg font-semibold">{t('Total {amount}', { amount: formatMoney(total, currency) })}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Supplier reference')} htmlFor="po-supplier-ref" hint={t('Their quote or order confirmation number')}>
              <Input
                id="po-supplier-ref"
                maxLength={100}
                value={supplierReference}
                onChange={(e) => setSupplierReference(e.target.value)}
              />
            </Field>
            <Field label={t('Notes (printed on the order)')} htmlFor="po-notes" className="sm:col-span-2">
              <Textarea id="po-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          {isRevision && (
            <Field label={t('Reason for the revision')} htmlFor="po-revision-reason">
              <Input
                id="po-revision-reason"
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : isRevision ? t('Save revision') : t('Save draft')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
