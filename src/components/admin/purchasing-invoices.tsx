'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyRow, Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { DataCardField, DataCardFields, DataCardHeader, DataCards, useSmallScreen } from '@/components/ui/data-cards';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { useApproval } from '@/components/approval-dialog';
import { useSuppliers } from '@/components/admin/purchasing-suppliers';
import { netUnitCost } from '@/components/admin/purchasing-order-detail-dialog';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import {
  purchaseOrdersApi,
  SupplierInvoiceDetail,
  SupplierInvoiceInput,
  SupplierInvoiceStatus,
  supplierInvoicesApi,
} from '@/lib/api/purchasing';
import { formatDate, formatDateTime, formatMoney, todayLocalIso } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { QUANTITY_TEXT } from '@/lib/pos/quantity';

export const invoiceStatusLabels: Record<SupplierInvoiceStatus, string> = {
  pending_approval: 'Needs approval',
  open: 'Approved',
  void: 'Void',
};

const invoiceStatusVariant: Record<SupplierInvoiceStatus, 'warning' | 'info' | 'default'> = {
  pending_approval: 'warning',
  open: 'info',
  void: 'default',
};

export const today = () => todayLocalIso();
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Supplier invoices (accounts payable): list, entry with 3-way match, approval
 */
export function SupplierInvoicesTab() {
  const user = useAuthStore((s) => s.user);
  const canRecord = hasPermission(user, 'purchasing.payables');
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState('');
  const [status, setStatus] = useState<SupplierInvoiceStatus | ''>('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['supplier-invoices', supplierId, status],
    queryFn: () =>
      supplierInvoicesApi.list({ supplierId: supplierId || undefined, status: status || undefined }),
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
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as SupplierInvoiceStatus | '')}
          className="lg:w-44"
          aria-label={t('Filter by status')}
        >
          <option value="">{t('All statuses')}</option>
          {Object.entries(invoiceStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </Select>
        <div className="flex-1" />
        {canRecord && (
          <Button
            onClick={() => setCreating(true)}
            disabled={suppliers.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {t('New invoice')}
          </Button>
        )}
      </div>
      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load supplier invoices')}</ErrorMessage>
        </div>
      )}
      {smallScreen ? (
        // Phones: one card per invoice instead of a table that scrolls sideways
        <DataCards
          items={invoices}
          getKey={(invoice) => invoice.id}
          onItemClick={(invoice) => setOpenId(invoice.id)}
          loading={isLoading}
          loadingText={t('Loading...')}
          emptyText={t('No supplier invoices yet.')}
        >
          {(invoice) => (
            <>
              <DataCardHeader
                title={<span className="font-mono text-xs">{invoice.invoiceNumber}</span>}
                subtitle={
                  invoice.invoiceType === 'opening_balance'
                    ? `${invoice.supplier?.name ?? '—'} · ${t('Opening balance')}`
                    : (invoice.supplier?.name ?? '—')
                }
                onTitleClick={() => setOpenId(invoice.id)}
                badge={
                  <>
                    <Badge variant={invoiceStatusVariant[invoice.status]}>{t(invoiceStatusLabels[invoice.status])}</Badge>
                    {invoice.hasVariance && invoice.status !== 'void' && (
                      <AlertTriangle className="h-4 w-4 text-orange-500" aria-label={t('Variance against the order')} />
                    )}
                  </>
                }
              />
              <DataCardFields>
                <DataCardField label={t('Date')}>{formatDate(invoice.invoiceDate)}</DataCardField>
                <DataCardField label={t('Due')}>
                  <span className={invoice.overdue ? 'font-medium text-red-600' : undefined}>{formatDate(invoice.dueDate)}</span>
                </DataCardField>
                <DataCardField label={t('Total')}>{formatMoney(invoice.total, invoice.currencyCode)}</DataCardField>
                <DataCardField label={t('Owed')}>
                  <span className="font-medium">{formatMoney(invoice.amountOpen, invoice.currencyCode)}</span>
                </DataCardField>
                {invoice.purchaseOrder && (
                  <DataCardField label={t('PO')}>
                    <span className="font-mono text-xs">{invoice.purchaseOrder.poNumber}</span>
                  </DataCardField>
                )}
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>{t('Invoice')}</Th>
              <Th>{t('Supplier')}</Th>
              <Th>{t('PO')}</Th>
              <Th>{t('Date')}</Th>
              <Th>{t('Due')}</Th>
              <Th>{t('Status')}</Th>
              <Th className="text-right">{t('Total')}</Th>
              <Th className="text-right">{t('Owed')}</Th>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <EmptyRow colSpan={8}>{t('Loading...')}</EmptyRow>
            ) : invoices.length === 0 ? (
              <EmptyRow colSpan={8}>{t('No supplier invoices yet.')}</EmptyRow>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setOpenId(invoice.id)}>
                  <Td className="font-mono text-xs font-medium">
                    {invoice.invoiceNumber}
                    {invoice.invoiceType === 'opening_balance' && (
                      <div className="font-sans text-xs text-gray-500">{t('Opening balance')}</div>
                    )}
                  </Td>
                  <Td>{invoice.supplier?.name ?? '—'}</Td>
                  <Td className="font-mono text-xs">{invoice.purchaseOrder?.poNumber ?? '—'}</Td>
                  <Td className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</Td>
                  <Td className={`whitespace-nowrap ${invoice.overdue ? 'font-medium text-red-600' : ''}`}>
                    {formatDate(invoice.dueDate)}
                  </Td>
                  <Td>
                    <Badge variant={invoiceStatusVariant[invoice.status]}>{t(invoiceStatusLabels[invoice.status])}</Badge>
                    {invoice.hasVariance && invoice.status !== 'void' && (
                      <AlertTriangle
                        className="ml-1 inline h-4 w-4 text-orange-500"
                        aria-label={t('Variance against the order')}
                      />
                    )}
                  </Td>
                  <Td className="text-right">{formatMoney(invoice.total, invoice.currencyCode)}</Td>
                  <Td className="text-right">{formatMoney(invoice.amountOpen, invoice.currencyCode)}</Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      )}
      {creating && (
        <SupplierInvoiceFormDialog
          onClose={() => setCreating(false)}
          onSaved={(invoice) => {
            setCreating(false);
            setOpenId(invoice.id);
          }}
        />
      )}
      {openId && <SupplierInvoiceDetailDialog id={openId} onClose={() => setOpenId(null)} />}
    </Card>
  );
}

interface InvoiceLine {
  key: string;
  purchaseOrderItemId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxAmount: string;
  // From the order: shown to compare while typing
  expectedUnitPrice?: number;
  receivedQuantity?: number;
  include: boolean;
}

function SupplierInvoiceFormDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (invoice: SupplierInvoiceDetail) => void;
}) {
  const queryClient = useQueryClient();
  const storeCurrency = useCurrency();
  const { data: suppliers = [] } = useSuppliers();
  const [supplierId, setSupplierId] = useState('');
  const [type, setType] = useState<'standard' | 'opening_balance'>('standard');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const smallScreen = useSmallScreen();
  const supplier = suppliers.find((s) => s.id === supplierId);
  const currency = supplier?.currencyCode ?? storeCurrency;

  const { data: orders = [] } = useQuery({
    queryKey: ['purchase-orders', 'for-invoice', supplierId],
    queryFn: () => purchaseOrdersApi.list({ supplierId }),
    enabled: !!supplierId && type === 'standard',
  });
  const invoiceable = orders.filter((o) =>
    ['issued', 'partially_received', 'received', 'closed'].includes(o.status)
  );

  const chooseOrder = async (id: string) => {
    setPurchaseOrderId(id);
    if (!id) return setLines((prev) => prev.filter((l) => !l.purchaseOrderItemId));
    try {
      const order = await purchaseOrdersApi.get(id);
      setLines([
        ...order.items.map((item) => ({
          key: item.id,
          purchaseOrderItemId: item.id,
          description: item.productName,
          quantity: String(item.quantityReceived),
          unitPrice: String(netUnitCost(item)),
          taxAmount: '',
          expectedUnitPrice: netUnitCost(item),
          receivedQuantity: item.quantityReceived,
          include: item.quantityReceived > 0,
        })),
        ...lines.filter((l) => !l.purchaseOrderItemId),
      ]);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load the order'));
    }
  };

  const update = (key: string, patch: Partial<InvoiceLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // Line controls, shared by the table (desktop) and the cards (phones)
  const includeBox = (line: InvoiceLine) => (
    <input
      type="checkbox"
      className="h-4 w-4"
      checked={line.include}
      onChange={(e) => update(line.key, { include: e.target.checked })}
      aria-label={t('Include {name}', { name: line.description || '—' })}
    />
  );
  const lineDescription = (line: InvoiceLine, className?: string) =>
    line.purchaseOrderItemId ? (
      <>
        <div className="font-medium">{line.description}</div>
        <div className="text-xs text-gray-500">
          {t('Ordered at {price} · received {count}', {
            price: formatMoney(line.expectedUnitPrice ?? 0, currency),
            count: line.receivedQuantity ?? 0,
          })}
        </div>
      </>
    ) : (
      <Input
        placeholder={t('e.g. Freight')}
        value={line.description}
        onChange={(e) => update(line.key, { description: e.target.value })}
        className={className}
        aria-label={t('Description')}
      />
    );
  const quantityInput = (line: InvoiceLine, className = '') => (
    <Input
      inputMode="numeric"
      className={cn(
        line.receivedQuantity != null && Number(line.quantity) > line.receivedQuantity ? 'border-orange-400' : '',
        className
      )}
      value={line.quantity}
      onChange={(e) => update(line.key, { quantity: e.target.value })}
      aria-label={t('Quantity for {name}', { name: line.description || '—' })}
    />
  );
  const unitPriceInput = (line: InvoiceLine, className = '') => {
    const price = Number(line.unitPrice);
    const priceHigher = line.expectedUnitPrice != null && !isNaN(price) && price > line.expectedUnitPrice;
    return (
      <Input
        inputMode="decimal"
        className={cn(priceHigher ? 'border-orange-400' : '', className)}
        value={line.unitPrice}
        onChange={(e) => update(line.key, { unitPrice: e.target.value })}
        aria-label={t('Unit price for {name}', {
          name: line.description || '—',
        })}
      />
    );
  };
  const taxInput = (line: InvoiceLine, className?: string) => (
    <Input
      inputMode="decimal"
      placeholder="0.00"
      value={line.taxAmount}
      onChange={(e) => update(line.key, { taxAmount: e.target.value })}
      className={className}
      aria-label={t('Tax for {name}', { name: line.description || '—' })}
    />
  );
  const lineTotal = (line: InvoiceLine) =>
    formatMoney(round2((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)) + (Number(line.taxAmount) || 0), currency);
  const removeLineButton = (line: InvoiceLine) =>
    !line.purchaseOrderItemId && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600"
        aria-label={t('Remove line')}
        onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
      >
        <X className="h-4 w-4" />
      </Button>
    );

  const save = useMutation({
    mutationFn: (input: SupplierInvoiceInput) => supplierInvoicesApi.create(input),
    onSuccess: async (invoice) => {
      await queryClient.invalidateQueries({ queryKey: ['supplier-invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['payables'] });
      onSaved(invoice);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the invoice')),
  });

  const included = lines.filter((l) => l.include);
  const total = round2(
    included.reduce(
      (sum, l) =>
        sum + round2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)) + (Number(l.taxAmount) || 0),
      0
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!supplierId) return setError(t('Choose a supplier.'));
    if (!invoiceNumber.trim()) return setError(t('Enter the supplier’s invoice number.'));
    if (invoiceDate > today()) return setError(t('The invoice date cannot be in the future'));
    if (dueDate && dueDate < invoiceDate) return setError(t('The due date cannot be before the invoice date.'));
    const base = {
      supplierId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceType: type,
      invoiceDate,
      ...(dueDate && { dueDate }),
      ...(notes.trim() && { notes: notes.trim() }),
    };
    if (type === 'opening_balance') {
      const value = Number(amount);
      if (!amount.trim() || isNaN(value) || value <= 0) return setError(t('Enter the amount owed.'));
      return save.mutate({ ...base, amount: round2(value) });
    }
    const items: NonNullable<SupplierInvoiceInput['items']> = [];
    for (const line of included) {
      if (!QUANTITY_TEXT.test(line.quantity.trim()) || Number(line.quantity) <= 0) {
        return setError(t('Enter a quantity above 0 (up to 4 decimals) for {name}.', { name: line.description || '—' }));
      }
      const price = Number(line.unitPrice);
      if (line.unitPrice.trim() === '' || isNaN(price) || price < 0) {
        return setError(t('Enter a unit price for {name}.', { name: line.description || '—' }));
      }
      const lineTax = Number(line.taxAmount || 0);
      if (isNaN(lineTax) || lineTax < 0) {
        return setError(t('Enter a valid tax amount for {name}.', { name: line.description || '—' }));
      }
      if (!line.purchaseOrderItemId && !line.description.trim()) {
        return setError(t('A line not on the order needs a description.'));
      }
      items.push({
        ...(line.purchaseOrderItemId && { purchaseOrderItemId: line.purchaseOrderItemId }),
        ...(line.description.trim() && { description: line.description.trim() }),
        quantity: Number(line.quantity),
        unitPrice: price,
        ...(lineTax > 0 && { taxAmount: lineTax }),
      });
    }
    if (items.length === 0) return setError(t('Add at least one invoice line.'));
    save.mutate({ ...base, ...(purchaseOrderId && { purchaseOrderId }), items });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('New supplier invoice')}</DialogTitle>
          <DialogDescription>
            {t(
              'Lines taken from a purchase order are matched against the order price and what was received (3-way match). Differences beyond the tolerance need approval before the invoice can be paid.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label={t('Supplier')} htmlFor="inv-supplier">
              <Select
                id="inv-supplier"
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setPurchaseOrderId('');
                  setLines([]);
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
            <Field label={t('Type')} htmlFor="inv-type">
              <Select
                id="inv-type"
                value={type}
                onChange={(e) => setType(e.target.value as 'standard' | 'opening_balance')}
              >
                <option value="standard">{t('Invoice')}</option>
                <option value="opening_balance">{t('Opening balance')}</option>
              </Select>
            </Field>
            <Field label={t('Supplier invoice number')} htmlFor="inv-number">
              <Input
                id="inv-number"
                maxLength={100}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </Field>
            <Field
              label={t('Invoice date')}
              htmlFor="inv-date"
              error={invoiceDate > today() ? t('The invoice date cannot be in the future') : undefined}
            >
              <Input
                id="inv-date"
                type="date"
                max={today()}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Field>
            <Field
              label={t('Due date')}
              htmlFor="inv-due"
              hint={
                supplier?.paymentTermDays != null
                  ? t('Empty = invoice date + {count} days (supplier terms)', { count: supplier.paymentTermDays })
                  : t('Empty = the invoice date')
              }
            >
              <Input
                id="inv-due"
                type="date"
                min={invoiceDate || undefined}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            {type === 'standard' ? (
              <Field label={t('Purchase order')} htmlFor="inv-po">
                <Select
                  id="inv-po"
                  value={purchaseOrderId}
                  disabled={!supplierId}
                  onChange={(e) => void chooseOrder(e.target.value)}
                >
                  <option value="">{t('None')}</option>
                  {invoiceable.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.poNumber} · {formatMoney(o.total, o.currencyCode)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label={t('Amount owed ({currency})', { currency })} htmlFor="inv-amount">
                <Input id="inv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            )}
          </div>

          {type === 'standard' && (
            <>
              {smallScreen ? (
                // Phones: one card per line, every box in view (the table scrolls sideways)
                <div className="space-y-2">
                  {lines.length === 0 && (
                    <p className="rounded-md border p-3 text-center text-sm text-gray-400">
                      {t('Choose a purchase order to take its lines, or add lines by hand.')}
                    </p>
                  )}
                  {lines.map((line) => (
                    <div key={line.key} className={cn('space-y-2 rounded-md border p-3 text-sm', !line.include && 'opacity-50')}>
                      <div className="flex items-start gap-2">
                        <div className="pt-1">{includeBox(line)}</div>
                        <div className="min-w-0 flex-1">{lineDescription(line, 'h-10 w-full')}</div>
                        {removeLineButton(line)}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block space-y-1">
                          <span className="text-xs text-gray-500">{t('Qty')}</span>
                          {quantityInput(line, 'h-10 w-full')}
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs text-gray-500">{t('Unit price')}</span>
                          {unitPriceInput(line, 'h-10 w-full')}
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs text-gray-500">{t('Tax')}</span>
                          {taxInput(line, 'h-10 w-full')}
                        </label>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('Total')}</span>
                        <span className="font-medium">{lineTotal(line)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                      <tr>
                        <th className="w-8 px-2 py-2" />
                        <th className="px-3 py-2 font-medium">{t('Description')}</th>
                        <th className="w-20 px-2 py-2 font-medium">{t('Qty')}</th>
                        <th className="w-28 px-2 py-2 font-medium">{t('Unit price')}</th>
                        <th className="w-24 px-2 py-2 font-medium">{t('Tax')}</th>
                        <th className="w-24 px-2 py-2 text-right font-medium">{t('Total')}</th>
                        <th className="w-8 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                            {t('Choose a purchase order to take its lines, or add lines by hand.')}
                          </td>
                        </tr>
                      ) : (
                        lines.map((line) => (
                          <tr key={line.key} className={line.include ? '' : 'opacity-50'}>
                            <td className="px-2 py-2">{includeBox(line)}</td>
                            <td className="px-3 py-2">{lineDescription(line)}</td>
                            <td className="px-2 py-2">{quantityInput(line)}</td>
                            <td className="px-2 py-2">{unitPriceInput(line)}</td>
                            <td className="px-2 py-2">{taxInput(line)}</td>
                            <td className="px-2 py-2 text-right">{lineTotal(line)}</td>
                            <td className="px-2 py-2">{removeLineButton(line)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      {
                        key: `extra-${Date.now()}`,
                        description: '',
                        quantity: '1',
                        unitPrice: '',
                        taxAmount: '',
                        include: true,
                      },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" />
                  {t('Add a line')}
                </Button>
                <span className="text-lg font-semibold">
                  {t('Total {amount}', { amount: formatMoney(total, currency) })}
                </span>
              </div>
            </>
          )}
          <Field label={t('Notes')} htmlFor="inv-notes">
            <Input id="inv-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Save invoice')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierInvoiceDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canRecord = hasPermission(user, 'purchasing.payables');
  const { withApproval, approvalDialog } = useApproval();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const { data: invoice, error: loadError } = useQuery({
    queryKey: ['supplier-invoices', 'detail', id],
    queryFn: () => supplierInvoicesApi.get(id),
  });

  const act = useMutation({
    mutationFn: async (action: 'approve' | 'void') => {
      if (action === 'approve') {
        return withApproval((headers) => supplierInvoicesApi.approve(id, headers));
      }
      const reason = window.prompt(t('Why is this invoice void? (required)'));
      if (reason === null) throw new Error('cancelled');
      if (!reason.trim()) throw new Error(t('A reason is required.'));
      return supplierInvoicesApi.void(id, reason.trim());
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (updated, action) => {
      queryClient.setQueryData(['supplier-invoices', 'detail', id], updated);
      await queryClient.invalidateQueries({ queryKey: ['supplier-invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['payables'] });
      setMessage(action === 'approve' ? t('Invoice approved; it can now be paid.') : t('Invoice voided.'));
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'cancelled') return;
      setError(err instanceof Error && !('response' in err) ? err.message : getErrorMessage(err, 'Could not update the invoice'));
    },
  });

  const currency = invoice?.currencyCode ?? 'USD';

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !act.isPending && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {invoice ? t('Invoice {number}', { number: invoice.invoiceNumber }) : t('Invoice')}
              {invoice && (
                <Badge variant={invoiceStatusVariant[invoice.status]}>{t(invoiceStatusLabels[invoice.status])}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {invoice
                ? `${invoice.supplier?.name ?? ''} · ${t('dated {date}, due {due}', {
                    date: formatDate(invoice.invoiceDate),
                    due: formatDate(invoice.dueDate),
                  })}${invoice.purchaseOrder ? ` · ${invoice.purchaseOrder.poNumber}` : ''}`
                : t('Loading...')}
            </DialogDescription>
          </DialogHeader>
          <ErrorMessage>
            {error ?? (loadError ? getErrorMessage(loadError, 'Could not load the invoice') : null)}
          </ErrorMessage>
          {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</div>}
          {invoice?.status === 'pending_approval' && (
            <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              {t(
                'Some lines differ from the order or the receipts beyond the tolerance. Someone other than the person who entered it, with "Approve purchase orders", must approve it before it can be paid.'
              )}
            </p>
          )}
          {invoice && invoice.items.length > 0 && smallScreen && (
            // Phones: one card per invoice line (the table scrolls sideways)
            <div className="space-y-2">
              {invoice.items.map((item) => (
                <div key={item.id} className={cn('space-y-2 rounded-md border p-3 text-sm', item.varianceFlag && 'bg-orange-50')}>
                  <div>
                    <div className="break-words font-medium">{item.description}</div>
                    {item.purchaseOrderItemId == null && <div className="text-xs text-gray-500">{t('Not on the order')}</div>}
                  </div>
                  <DataCardFields>
                    <DataCardField label={t('Qty')}>{item.quantity}</DataCardField>
                    <DataCardField label={t('Unit price')}>{formatMoney(item.unitPrice, currency)}</DataCardField>
                    <DataCardField label={t('Order price')}>
                      {item.expectedUnitPrice != null ? formatMoney(item.expectedUnitPrice, currency) : '—'}
                    </DataCardField>
                    <DataCardField label={t('Price variance')}>
                      {item.expectedUnitPrice != null ? (
                        <>
                          {formatMoney(item.priceVariance, currency)}
                          {item.priceVariancePercent != null && (
                            <span className="text-xs text-gray-500"> ({Number(item.priceVariancePercent)}%)</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </DataCardField>
                    <DataCardField label={t('Qty variance')}>
                      {item.matchableQuantity != null ? (
                        <>
                          {item.quantityVariance > 0 ? `+${item.quantityVariance}` : item.quantityVariance}
                          <div className="text-xs text-gray-500">
                            {t('{count} to bill', {
                              count: item.matchableQuantity,
                            })}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </DataCardField>
                    <DataCardField label={t('Total')}>
                      <span className="font-medium">{formatMoney(item.total, currency)}</span>
                    </DataCardField>
                  </DataCardFields>
                </div>
              ))}
            </div>
          )}
          {invoice && invoice.items.length > 0 && !smallScreen && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Description')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Qty')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Unit price')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Order price')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Price variance')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Qty variance')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className={item.varianceFlag ? 'bg-orange-50' : ''}>
                      <td className="px-3 py-2">
                        {item.description}
                        {item.purchaseOrderItemId == null && (
                          <div className="text-xs text-gray-500">{t('Not on the order')}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.unitPrice, currency)}</td>
                      <td className="px-3 py-2 text-right">
                        {item.expectedUnitPrice != null ? formatMoney(item.expectedUnitPrice, currency) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.expectedUnitPrice != null ? (
                          <>
                            {formatMoney(item.priceVariance, currency)}
                            {item.priceVariancePercent != null && (
                              <div className="text-xs text-gray-500">{Number(item.priceVariancePercent)}%</div>
                            )}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.matchableQuantity != null ? (
                          <>
                            {item.quantityVariance > 0 ? `+${item.quantityVariance}` : item.quantityVariance}
                            <div className="text-xs text-gray-500">
                              {t('{count} to bill', { count: item.matchableQuantity })}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(item.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {invoice && (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="space-y-1 text-gray-600">
                <div>{t('Subtotal {amount}', { amount: formatMoney(invoice.subtotal, currency) })}</div>
                <div>{t('Tax {amount}', { amount: formatMoney(invoice.taxAmount, currency) })}</div>
                <div className="font-semibold text-gray-900">
                  {t('Total {amount}', { amount: formatMoney(invoice.total, currency) })}
                </div>
                <div className="font-semibold text-gray-900">
                  {t('Still owed: {amount}', { amount: formatMoney(invoice.amountOpen, currency) })}
                </div>
                {invoice.createdByName && <div>{t('Entered by {name}', { name: invoice.createdByName })}</div>}
                {invoice.approvedAt && (
                  <div>
                    {t('Approved by {name} on {date}', {
                      name: invoice.approvedByName ?? '—',
                      date: formatDateTime(invoice.approvedAt),
                    })}
                  </div>
                )}
                {invoice.voidReason && <div>{t('Void: {reason}', { reason: invoice.voidReason })}</div>}
                {invoice.notes && <div>{t('Notes: {notes}', { notes: invoice.notes })}</div>}
              </div>
              <div>
                <div className="mb-1 font-medium">{t('Payments and credits')}</div>
                {invoice.allocations.length === 0 ? (
                  <p className="text-gray-400">{t('Nothing paid yet.')}</p>
                ) : (
                  <ul className="space-y-1 text-gray-600">
                    {invoice.allocations.map((a) => (
                      <li key={a.id}>
                        <span className="font-mono text-xs">{a.paymentNumber ?? a.creditNumber}</span> ·{' '}
                        {formatDateTime(a.createdAt)} · {formatMoney(a.amount, currency)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <div>
              {canRecord && invoice && invoice.status !== 'void' && invoice.allocations.length === 0 && (
                <Button
                  variant="outline"
                  className="text-red-600"
                  disabled={act.isPending}
                  onClick={() => act.mutate('void')}
                >
                  {t('Void invoice')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={act.isPending}>
                {t('Close')}
              </Button>
              {invoice?.status === 'pending_approval' && (
                <Button
                  disabled={act.isPending}
                  onClick={() => act.mutate('approve')}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  {t('Approve')}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
