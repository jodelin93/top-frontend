'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { VariantPicker, useDebouncedValue, variantLabel } from '@/components/admin/inventory-variant-picker';
import { useApproval } from '@/components/approval-dialog';
import { useSmallScreen } from '@/components/ui/data-cards';
import { customerName, customersApi } from '@/lib/api/customers';
import { Estimate, estimatesApi, EstimateInput } from '@/lib/api/estimates';
import { getErrorMessage } from '@/lib/api/client';
import { formatMoney, todayLocalIso } from '@/lib/format';
import { useCurrency } from '@/hooks/use-store-settings';
import { t } from '@/i18n';

interface Line {
  variantId: string;
  label: string;
  sku: string;
  catalogPrice: number;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
  note: string;
}

const toLines = (estimate: Estimate | null): Line[] =>
  (estimate?.items ?? []).map((item) => ({
    variantId: item.variantId,
    label: [item.productName, item.variantName].filter(Boolean).join(' — '),
    sku: item.sku,
    catalogPrice: Number(item.catalogPrice),
    quantity: String(Number(item.quantity)),
    unitPrice: String(Number(item.unitPrice)),
    discountPercent: Number(item.discountPercent) ? String(Number(item.discountPercent)) : '',
    note: item.note ?? '',
  }));

/**
 * Create or edit an estimate. Prices, tax and totals are computed by the server
 * (price lists, tax categories, discounts) when saving.
 */
export function EstimateFormDialog({
  open,
  onOpenChange,
  estimate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimate: Estimate | null;
  onSaved: (estimate: Estimate) => void;
}) {
  const currency = useCurrency();
  const money = (value: number) => formatMoney(value, currency);
  const { withApproval, approvalDialog } = useApproval();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomer = useDebouncedValue(customerSearch.trim());
  const [lines, setLines] = useState<Line[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [cartType, setCartType] = useState<'percentage' | 'fixed'>('percentage');
  const [cartValue, setCartValue] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [error, setError] = useState<string | null>(null);
  // A new validity date can't already be over (an unchanged one is kept as is)
  const validUntilError =
    validUntil && validUntil !== (estimate?.validUntil ?? '') && validUntil < todayLocalIso()
      ? t('The valid-until date cannot be in the past')
      : null;
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const key = open ? (estimate?.id ?? 'new') : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key) {
      setCustomerId(estimate?.customerId ?? null);
      setCustomerLabel(estimate?.customer ? customerName(estimate.customer) : '');
      setProspectName(estimate?.customerName ?? '');
      setCustomerSearch('');
      setLines(toLines(estimate));
      setValidUntil(estimate?.validUntil ?? '');
      setCartType(estimate?.cartDiscount?.type ?? 'percentage');
      setCartValue(estimate?.cartDiscount ? String(estimate.cartDiscount.value) : '');
      setNotes(estimate?.notes ?? '');
      setTerms(estimate?.terms ?? '');
      setError(null);
    }
  }

  const { data: customers = [] } = useQuery({
    queryKey: ['estimates', 'customers', debouncedCustomer],
    queryFn: () => customersApi.list({ search: debouncedCustomer, status: 'active' }),
    enabled: open && debouncedCustomer.length >= 2,
  });

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const smallScreen = useSmallScreen();

  // Line inputs, shared by the table and the phone cards
  const quantityInput = (line: Line, index: number, className: string) => (
    <Input
      value={line.quantity}
      onChange={(e) => setLine(index, { quantity: e.target.value })}
      inputMode="decimal"
      className={className}
      aria-label={t('Quantity')}
    />
  );
  const unitPriceInput = (line: Line, index: number, className: string) => (
    <Input
      value={line.unitPrice}
      onChange={(e) => setLine(index, { unitPrice: e.target.value })}
      inputMode="decimal"
      placeholder={line.catalogPrice.toFixed(2)}
      className={className}
      aria-label={t('Unit price')}
    />
  );
  const discountInput = (line: Line, index: number, className: string) => (
    <Input
      value={line.discountPercent}
      onChange={(e) => setLine(index, { discountPercent: e.target.value })}
      inputMode="decimal"
      placeholder="0"
      className={className}
      aria-label={t('Discount percent')}
    />
  );
  const noteInput = (line: Line, index: number, className: string) => (
    <Input
      value={line.note}
      onChange={(e) => setLine(index, { note: e.target.value })}
      className={className}
      aria-label={t('Line note')}
    />
  );
  const removeButton = (index: number, className: string) => (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setLines(lines.filter((_, i) => i !== index))}
      aria-label={t('Remove line')}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  // Before tax and order-level discount; the server returns the exact total
  const roughSubtotal = lines.reduce((sum, line) => {
    const qty = Number(line.quantity.replace(',', '.')) || 0;
    const price = line.unitPrice === '' ? line.catalogPrice : Number(line.unitPrice) || 0;
    const pct = Number(line.discountPercent) || 0;
    return sum + qty * price * (1 - pct / 100);
  }, 0);

  const save = async () => {
    if (lines.length === 0) {
      setError(t('Add at least one product'));
      return;
    }
    // Measured items (kg, m, l) take decimals; the server checks each unit's precision
    if (lines.some((l) => !(Number(l.quantity.replace(',', '.')) > 0))) {
      setError(t('Every line needs a quantity above 0'));
      return;
    }
    if (validUntilError) {
      setError(validUntilError);
      return;
    }
    setSaving(true);
    setError(null);
    const input: EstimateInput = {
      customerId: customerId,
      customerName: customerId ? null : prospectName.trim() || null,
      validUntil: validUntil || undefined,
      cartDiscount: Number(cartValue) > 0 ? { type: cartType, value: Number(cartValue) } : null,
      notes: notes.trim() || null,
      terms: terms.trim() || null,
      items: lines.map((line) => ({
        variantId: line.variantId,
        quantity: Math.round(Number(line.quantity.replace(',', '.')) * 10_000) / 10_000,
        unitPrice: line.unitPrice === '' ? undefined : Number(line.unitPrice),
        discountPercent: Number(line.discountPercent) || undefined,
        note: line.note.trim() || undefined,
      })),
    };
    try {
      const saved = await withApproval((headers) =>
        estimate ? estimatesApi.update(estimate.id, input, headers) : estimatesApi.create(input, headers)
      );
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the estimate'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{estimate ? t('Edit {name}', { name: estimate.estimateNumber }) : t('New estimate')}</DialogTitle>
            <DialogDescription>
              {t(
                "A price quote for a customer. It doesn't reserve stock; once accepted, load it into the till to sell it at these prices."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ErrorMessage>{error}</ErrorMessage>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('Customer')} htmlFor="est-customer">
                {customerId ? (
                  <div className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                    {customerLabel}
                    <Button variant="ghost" size="sm" onClick={() => setCustomerId(null)}>
                      {t('Change')}
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id="est-customer"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder={t('Search customers (name, phone, email)')}
                    />
                    {customers.length > 0 && debouncedCustomer.length >= 2 && (
                      <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow">
                        {customers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setCustomerId(c.id);
                              setCustomerLabel(customerName(c));
                              setCustomerSearch('');
                            }}
                          >
                            {customerName(c)}
                            <span className="text-xs text-gray-500"> · {[c.phone, c.email].filter(Boolean).join(' · ')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Field>
              {!customerId && (
                <Field
                  label={t('…or prospect name')}
                  htmlFor="est-prospect"
                  hint={t('For someone not in your customer list')}
                >
                  <Input id="est-prospect" value={prospectName} onChange={(e) => setProspectName(e.target.value)} />
                </Field>
              )}
              <Field
                label={t('Valid until')}
                htmlFor="est-valid"
                hint={t('Default: 30 days from today')}
                error={validUntilError ?? undefined}
              >
                <Input
                  id="est-valid"
                  type="date"
                  min={todayLocalIso()}
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </Field>
            </div>

            {smallScreen ? (
              // Phones: one card per line with every box in view (the table would scroll sideways)
              <div className="space-y-2">
                {lines.length === 0 && (
                  <p className="rounded-md border px-3 py-6 text-center text-sm text-gray-400">{t('Add products below.')}</p>
                )}
                {lines.map((line, index) => (
                  <div key={`${line.variantId}-${index}`} className="space-y-2 rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 break-words">
                        {line.label}
                        <div className="text-xs text-gray-500">
                          {line.sku} · {t('list {price}', { price: money(line.catalogPrice) })}
                        </div>
                      </div>
                      {removeButton(index, 'h-10 w-10 shrink-0')}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="space-y-1 text-xs text-gray-500">
                        <span className="block">{t('Qty')}</span>
                        {quantityInput(line, index, 'h-10 w-full text-right')}
                      </label>
                      <label className="space-y-1 text-xs text-gray-500">
                        <span className="block">{t('Unit price')}</span>
                        {unitPriceInput(line, index, 'h-10 w-full text-right')}
                      </label>
                      <label className="space-y-1 text-xs text-gray-500">
                        <span className="block">{t('Disc. %')}</span>
                        {discountInput(line, index, 'h-10 w-full text-right')}
                      </label>
                    </div>
                    <label className="block space-y-1 text-xs text-gray-500">
                      <span className="block">{t('Note')}</span>
                      {noteInput(line, index, 'h-10 w-full')}
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm max-md:min-w-[32rem]">
                  <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2">{t('Product')}</th>
                      <th className="px-3 py-2 text-right">{t('Qty')}</th>
                      <th className="px-3 py-2 text-right">{t('Unit price')}</th>
                      <th className="px-3 py-2 text-right">{t('Disc. %')}</th>
                      <th className="px-3 py-2">{t('Note')}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {lines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                          {t('Add products below.')}
                        </td>
                      </tr>
                    )}
                    {lines.map((line, index) => (
                      <tr key={`${line.variantId}-${index}`}>
                        <td className="px-3 py-1.5">
                          {line.label}
                          <div className="text-xs text-gray-500">
                            {line.sku} ·{' '}
                            {t('list {price}', {
                              price: money(line.catalogPrice),
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">{quantityInput(line, index, 'ml-auto h-8 w-16 text-right')}</td>
                        <td className="px-3 py-1.5">{unitPriceInput(line, index, 'ml-auto h-8 w-24 text-right')}</td>
                        <td className="px-3 py-1.5">{discountInput(line, index, 'ml-auto h-8 w-16 text-right')}</td>
                        <td className="px-3 py-1.5">{noteInput(line, index, 'h-8')}</td>
                        <td className="px-3 py-1.5 text-right">{removeButton(index, 'h-8 w-8')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">{t('Add products')}</div>
              <VariantPicker
                renderAction={(product, variant) => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setLines((current) => [
                        ...current,
                        {
                          variantId: variant.id,
                          label: variantLabel(product, variant),
                          sku: variant.sku,
                          catalogPrice: Number(variant.price ?? 0),
                          quantity: '1',
                          unitPrice: '',
                          discountPercent: '',
                          note: '',
                        },
                      ])
                    }
                  >
                    {t('Add')}
                  </Button>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t('Discount on the whole estimate')} htmlFor="est-cart">
                <div className="flex gap-2">
                  <Select value={cartType} onChange={(e) => setCartType(e.target.value as 'percentage' | 'fixed')} className="w-28" aria-label={t('Discount type')}>
                    <option value="percentage">%</option>
                    <option value="fixed">{t('Amount')}</option>
                  </Select>
                  <Input id="est-cart" value={cartValue} onChange={(e) => setCartValue(e.target.value)} inputMode="decimal" placeholder="0" />
                </div>
              </Field>
              <Field label={t('Notes')} htmlFor="est-notes" className="sm:col-span-2">
                <Textarea id="est-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('e.g. Delivery included, installation on site')} />
              </Field>
            </div>
            <Field label={t('Terms & conditions')} htmlFor="est-terms">
              <Textarea id="est-terms" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={t('e.g. 50% deposit on acceptance, balance on delivery')} />
            </Field>
          </div>

          <DialogFooter className="items-center">
            <span className="mr-auto text-sm text-gray-500">
              {t('About {amount} before tax — exact totals are calculated on save', { amount: money(roughSubtotal) })}
            </span>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('Cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? t('Saving...') : t('Save estimate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
