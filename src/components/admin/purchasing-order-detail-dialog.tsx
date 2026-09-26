'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { CheckboxField, useLocationOptions } from '@/components/admin/settings-shared';
import { useApproval } from '@/components/approval-dialog';
import { useStoreSettings } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import {
  PurchaseOrderDetail,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  purchaseOrdersApi,
  ReceiveInput,
} from '@/lib/api/purchasing';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { plural, t } from '@/i18n';
import { addQty, QUANTITY_TEXT, subQty } from '@/lib/pos/quantity';

export const poStatusLabels: Record<PurchaseOrderStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Needs approval',
  approved: 'Approved',
  issued: 'Issued',
  partially_received: 'Partly received',
  received: 'Received',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const poStatusVariant: Record<PurchaseOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'info',
  issued: 'info',
  partially_received: 'warning',
  received: 'success',
  closed: 'success',
  cancelled: 'default',
};

// Price per unit after the line discount (what goes into stock), 4 decimals
export const netUnitCost = (item: Pick<PurchaseOrderItem, 'unitCost' | 'discountPercent'>) =>
  Math.round(Number(item.unitCost) * (1 - Number(item.discountPercent ?? 0) / 100) * 10000) / 10000;

// Units still expected on a line
export const outstanding = (item: PurchaseOrderItem) =>
  Math.max(0, subQty(item.quantityOrdered, addQty(item.quantityCancelled ?? 0, item.quantityReceived)));

// One key per receipt attempt: retries of the same submission reuse it
const newReceiptKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type Action = 'submit' | 'approve' | 'reject' | 'issue' | 'cancel' | 'close';

/**
 * Purchase order detail: lifecycle actions, goods receipt and printable view
 */
export function PurchaseOrderDetailDialog({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (order: PurchaseOrderDetail) => void;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, 'purchasing.manage');
  const canReceive = hasPermission(user, 'inventory.receive');
  const { labelFor } = useLocationOptions();
  const { withApproval, approvalDialog } = useApproval();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [receiving, setReceiving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const { data: order, error: loadError } = useQuery({
    queryKey: ['purchase-orders', 'detail', id],
    queryFn: () => purchaseOrdersApi.get(id),
  });

  const store = async (updated: PurchaseOrderDetail) => {
    queryClient.setQueryData(['purchase-orders', 'detail', id], updated);
    await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const run = useMutation({
    mutationFn: async (action: Action) => {
      switch (action) {
        case 'submit':
          return purchaseOrdersApi.submit(id);
        case 'approve':
          // Creator or no permission: another person approves with their credentials
          return withApproval((headers) => purchaseOrdersApi.approve(id, headers));
        case 'reject': {
          const reason = window.prompt(t('Why is this order sent back?')) ?? undefined;
          return withApproval((headers) => purchaseOrdersApi.reject(id, reason, headers));
        }
        case 'issue':
          return purchaseOrdersApi.issue(id);
        case 'cancel': {
          const reason = window.prompt(t('Reason for cancelling this order?'));
          if (reason === null) throw new Error('cancelled');
          return purchaseOrdersApi.cancel(id, reason || undefined);
        }
        case 'close': {
          const reason = window.prompt(
            order?.status === 'partially_received'
              ? t('Short-close: what was not received will no longer be expected. Reason (required):')
              : t('Reason for closing this order (required):')
          );
          if (reason === null) throw new Error('cancelled');
          if (!reason.trim()) throw new Error(t('A reason is required.'));
          return purchaseOrdersApi.close(id, reason.trim());
        }
      }
    },
    onMutate: () => {
      setError(null);
      setMessage(null);
    },
    onSuccess: async (updated, action) => {
      await store(updated);
      setMessage(
        {
          submit:
            updated.status === 'approved'
              ? t('Submitted and approved automatically (below the approval threshold).')
              : t('Submitted for approval.'),
          approve: t('Approved.'),
          reject: t('Sent back to draft.'),
          issue: t('Marked as issued to the supplier.'),
          cancel: t('Order cancelled.'),
          close: t('Order closed.'),
        }[action]
      );
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'cancelled') return;
      setError(
        err instanceof Error && !('response' in err) ? err.message : getErrorMessage(err, 'Could not update the order')
      );
    },
  });

  const status = order?.status;
  const busy = run.isPending;
  const currency = order?.currencyCode ?? 'USD';
  const anyCancelled = order?.items.some((i) => (i.quantityCancelled ?? 0) > 0);
  const anyTax = order?.items.some((i) => Number(i.taxAmount ?? 0) > 0);

  if (printing && order) {
    return (
      <PurchaseOrderPrintView
        order={order}
        locationLabel={labelFor(order.locationId)}
        onClose={() => setPrinting(false)}
      />
    );
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {order ? t('Purchase order {number}', { number: order.poNumber }) : t('Purchase order')}
              {order && <Badge variant={poStatusVariant[order.status]}>{t(poStatusLabels[order.status])}</Badge>}
            </DialogTitle>
            <DialogDescription>
              {order
                ? `${order.supplier?.name ?? ''} · ${t('deliver to {location}', {
                    location: labelFor(order.locationId, order.location?.code),
                  })}${
                    order.expectedDeliveryDate
                      ? ` · ${t('expected {date}', { date: formatDate(order.expectedDeliveryDate) })}`
                      : ''
                  }`
                : t('Loading...')}
            </DialogDescription>
          </DialogHeader>

          <ErrorMessage>
            {error ?? (loadError ? getErrorMessage(loadError, 'Could not load the order') : null)}
          </ErrorMessage>
          {message && <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</div>}
          {status === 'pending_approval' && (
            <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              {order?.revisedById
                ? t(
                    'This order was revised after approval and is above the approval threshold. Someone other than the person who revised it must approve it.'
                  )
                : t(
                    'This order is above the approval threshold. Someone other than its creator with "Approve purchase orders" must approve it.'
                  )}
            </p>
          )}

          {order && !receiving && (
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('Product')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('Ordered')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('Received')}</th>
                      {anyCancelled && <th className="px-3 py-2 text-right font-medium">{t('Cancelled')}</th>}
                      <th className="px-3 py-2 text-right font-medium">{t('Unit cost')}</th>
                      {anyTax && <th className="px-3 py-2 text-right font-medium">{t('Tax')}</th>}
                      <th className="px-3 py-2 text-right font-medium">{t('Total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.productName}</div>
                          <div className="font-mono text-xs text-gray-500">
                            {item.sku}
                            {item.supplierSku && ` · ${t('supplier code {code}', { code: item.supplierSku })}`}
                            {item.unitOfMeasure && ` · ${item.unitOfMeasure}`}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantityOrdered}</td>
                        <td
                          className={`px-3 py-2 text-right ${
                            item.quantityReceived > item.quantityOrdered ? 'font-medium text-orange-600' : ''
                          }`}
                        >
                          {item.quantityReceived}
                        </td>
                        {anyCancelled && <td className="px-3 py-2 text-right">{item.quantityCancelled ?? 0}</td>}
                        <td className="px-3 py-2 text-right">
                          {formatMoney(item.unitCost, currency)}
                          {Number(item.discountPercent ?? 0) > 0 && (
                            <div className="text-xs text-gray-500">
                              {t('−{percent}% discount', { percent: Number(item.discountPercent) })}
                            </div>
                          )}
                        </td>
                        {anyTax && (
                          <td className="px-3 py-2 text-right">{formatMoney(item.taxAmount ?? 0, currency)}</td>
                        )}
                        <td className="px-3 py-2 text-right">{formatMoney(item.total, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t text-sm">
                    <tr>
                      <td colSpan={4 + (anyCancelled ? 1 : 0) + (anyTax ? 1 : 0)} className="px-3 py-1 text-right text-gray-500">
                        {t('Subtotal')}
                      </td>
                      <td className="px-3 py-1 text-right">{formatMoney(order.subtotal, currency)}</td>
                    </tr>
                    {order.taxAmount > 0 && (
                      <tr>
                        <td colSpan={4 + (anyCancelled ? 1 : 0) + (anyTax ? 1 : 0)} className="px-3 py-1 text-right text-gray-500">
                          {t('Tax')}
                        </td>
                        <td className="px-3 py-1 text-right">{formatMoney(order.taxAmount, currency)}</td>
                      </tr>
                    )}
                    {order.shippingCost > 0 && (
                      <tr>
                        <td colSpan={4 + (anyCancelled ? 1 : 0) + (anyTax ? 1 : 0)} className="px-3 py-1 text-right text-gray-500">
                          {t('Shipping')}
                        </td>
                        <td className="px-3 py-1 text-right">{formatMoney(order.shippingCost, currency)}</td>
                      </tr>
                    )}
                    <tr className="font-semibold">
                      <td colSpan={4 + (anyCancelled ? 1 : 0) + (anyTax ? 1 : 0)} className="px-3 py-2 text-right">
                        {t('Total')}
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(order.total, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="space-y-1 text-gray-600">
                  <div>
                    {t('Created by {name} on {date}', {
                      name: order.createdByName ?? '—',
                      date: formatDateTime(order.createdAt),
                    })}
                  </div>
                  {order.approvedAt && (
                    <div>
                      {order.approvedByName
                        ? t('Approved by {name} on {date}', {
                            name: order.approvedByName,
                            date: formatDateTime(order.approvedAt),
                          })
                        : t('Approved automatically on {date}', { date: formatDateTime(order.approvedAt) })}
                    </div>
                  )}
                  {order.issuedAt && <div>{t('Issued on {date}', { date: formatDateTime(order.issuedAt) })}</div>}
                  {order.cancelledAt && (
                    <div>
                      {t('Cancelled on {date}', { date: formatDateTime(order.cancelledAt) })}
                      {order.cancelReason && ` — ${order.cancelReason}`}
                    </div>
                  )}
                  {order.closedAt && (
                    <div>
                      {t('Closed on {date}', { date: formatDateTime(order.closedAt) })}
                      {order.closeReason && ` — ${order.closeReason}`}
                    </div>
                  )}
                  {order.supplierReference && (
                    <div>{t('Supplier reference: {reference}', { reference: order.supplierReference })}</div>
                  )}
                  {order.notes && <div>{t('Notes: {notes}', { notes: order.notes })}</div>}
                </div>
                <div>
                  <div className="mb-1 font-medium">{t('Goods receipts')}</div>
                  {order.receipts.length === 0 ? (
                    <p className="text-gray-400">{t('Nothing received yet.')}</p>
                  ) : (
                    <ul className="space-y-1 text-gray-600">
                      {order.receipts.map((receipt) => (
                        <li key={receipt.id}>
                          <span className="font-mono text-xs">{receipt.receiptNumber}</span> ·{' '}
                          {formatDateTime(receipt.receivedAt)} ·{' '}
                          {plural(
                            receipt.items.reduce((sum, i) => addQty(sum, i.quantity), 0),
                            '{count} unit',
                            '{count} units'
                          )}{' '}
                          · {formatMoney(receipt.totalCost, currency)}
                          {receipt.reference && ` · ${t('ref. {reference}', { reference: receipt.reference })}`}
                          {order.people[receipt.userId] && ` · ${order.people[receipt.userId]}`}
                          {receipt.items.some((i) => i.condition === 'damaged') && (
                            <span className="text-orange-700">
                              {' · '}
                              {t('{accepted} damaged accepted, {rejected} rejected', {
                                accepted: receipt.items
                                  .filter((i) => i.condition === 'damaged' && i.accepted)
                                  .reduce((sum, i) => addQty(sum, i.quantity), 0),
                                rejected: receipt.items
                                  .filter((i) => i.condition === 'damaged' && !i.accepted)
                                  .reduce((sum, i) => addQty(sum, i.quantity), 0),
                              })}
                            </span>
                          )}
                          {receipt.overReceiptApprovedById && (
                            <span className="text-orange-700">
                              {' · '}
                              {t('over-receipt approved by {name}', {
                                name: order.people[receipt.overReceiptApprovedById] ?? '—',
                              })}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {(order.revisions?.length ?? 0) > 0 && (
                <div className="text-sm">
                  <div className="mb-1 font-medium">{t('Revisions')}</div>
                  <ul className="space-y-2">
                    {order.revisions!.map((revision) => (
                      <RevisionRow
                        key={revision.id}
                        revision={revision}
                        currency={currency}
                        by={order.people[revision.userId] ?? '—'}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {order && receiving && (
            <ReceiveForm
              order={order}
              withApproval={withApproval}
              onCancel={() => setReceiving(false)}
              onReceived={async (updated, text) => {
                await store(updated);
                await queryClient.invalidateQueries({ queryKey: ['inventory'] });
                setReceiving(false);
                setMessage(text);
              }}
            />
          )}

          {!receiving && (
            <DialogFooter className="sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {canManage && status && ['draft', 'pending_approval', 'approved', 'issued'].includes(status) && (
                  <Button
                    variant="outline"
                    className="text-red-600"
                    disabled={busy}
                    onClick={() => run.mutate('cancel')}
                  >
                    {t('Cancel order')}
                  </Button>
                )}
                {canManage && (status === 'partially_received' || status === 'received') && (
                  <Button variant="outline" disabled={busy} onClick={() => run.mutate('close')}>
                    {status === 'partially_received' ? t('Short-close') : t('Close order')}
                  </Button>
                )}
                {order && status !== 'draft' && (
                  <Button variant="outline" onClick={() => setPrinting(true)}>
                    <Printer className="h-4 w-4" />
                    {t('Print')}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onClose} disabled={busy}>
                  {t('Close')}
                </Button>
                {canManage && status === 'draft' && order && (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => onEdit(order)}>
                      {t('Edit')}
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => run.mutate('submit')}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {t('Submit')}
                    </Button>
                  </>
                )}
                {status === 'pending_approval' && (
                  <>
                    <Button variant="outline" disabled={busy} onClick={() => run.mutate('reject')}>
                      {t('Send back')}
                    </Button>
                    <Button
                      disabled={busy}
                      onClick={() => run.mutate('approve')}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {t('Approve')}
                    </Button>
                  </>
                )}
                {canManage && order && status && ['approved', 'issued', 'partially_received'].includes(status) && (
                  <Button variant="outline" disabled={busy} onClick={() => onEdit(order)}>
                    {t('Revise')}
                  </Button>
                )}
                {canManage && status === 'approved' && (
                  <Button
                    disabled={busy}
                    onClick={() => run.mutate('issue')}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {t('Mark as issued')}
                  </Button>
                )}
                {canReceive && (status === 'issued' || status === 'partially_received') && (
                  <Button onClick={() => setReceiving(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                    <PackageCheck className="h-4 w-4" />
                    {t('Receive goods')}
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}

function RevisionRow({
  revision,
  currency,
  by,
}: {
  revision: NonNullable<PurchaseOrderDetail['revisions']>[number];
  currency: string;
  by: string;
}) {
  const [open, setOpen] = useState(false);
  const before = new Map(revision.before.lines.map((l) => [l.variantId, l]));
  const after = new Map(revision.after.lines.map((l) => [l.variantId, l]));
  const variantIds = [...new Set([...before.keys(), ...after.keys()])];
  return (
    <li className="rounded-md border p-2">
      <button type="button" className="w-full text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="font-medium">{t('Revision {number}', { number: revision.revisionNumber })}</span>
        {' · '}
        {t('{name} on {date}', { name: by, date: formatDateTime(revision.createdAt) })}
        {' · '}
        {formatMoney(revision.totalBefore, currency)} → {formatMoney(revision.totalAfter, currency)}
        {revision.requiresApproval && !revision.rejectedAt && (
          <Badge variant="warning" className="ml-2">
            {t('Sent back for approval')}
          </Badge>
        )}
        {revision.rejectedAt && (
          <Badge variant="danger" className="ml-2">
            {t('Rejected; order restored')}
          </Badge>
        )}
        {revision.reason && <div className="text-xs text-gray-500">{revision.reason}</div>}
      </button>
      {open && (
        <table className="mt-2 w-full text-xs">
          <thead className="text-left text-gray-500">
            <tr>
              <th className="py-1 font-medium">{t('Product')}</th>
              <th className="py-1 text-right font-medium">{t('Before')}</th>
              <th className="py-1 text-right font-medium">{t('After')}</th>
            </tr>
          </thead>
          <tbody>
            {variantIds.map((variantId) => {
              const b = before.get(variantId);
              const a = after.get(variantId);
              const describe = (line: typeof a) =>
                line
                  ? `${line.quantityOrdered} × ${formatMoney(line.unitCost, currency)}${
                      line.discountPercent ? ` −${line.discountPercent}%` : ''
                    } = ${formatMoney(line.total, currency)}`
                  : '—';
              const changed = describe(b) !== describe(a);
              return (
                <tr key={variantId} className={changed ? 'bg-yellow-50' : ''}>
                  <td className="py-1">{(a ?? b)!.productName}</td>
                  <td className="py-1 text-right">{describe(b)}</td>
                  <td className="py-1 text-right">{describe(a)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </li>
  );
}

type WithApproval = ReturnType<typeof useApproval>['withApproval'];

function ReceiveForm({
  order,
  withApproval,
  onCancel,
  onReceived,
}: {
  order: PurchaseOrderDetail;
  withApproval: WithApproval;
  onCancel: () => void;
  onReceived: (order: PurchaseOrderDetail, message: string) => Promise<void>;
}) {
  const currency = order.currencyCode;
  const open = order.items.filter((i) => outstanding(i) > 0);
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(open.map((i) => [i.id, String(outstanding(i))]))
  );
  const [damaged, setDamaged] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [costs, setCosts] = useState<Record<string, string>>(
    Object.fromEntries(open.map((i) => [i.id, String(netUnitCost(i))]))
  );
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Same key for every retry of this receipt, so a double submit never posts twice
  const [idempotencyKey] = useState(newReceiptKey);

  const intoStock = (item: PurchaseOrderItem) =>
    (Number(quantities[item.id]) || 0) + (accepted[item.id] ? Number(damaged[item.id]) || 0 : 0);

  const receive = useMutation({
    mutationFn: async () => {
      const items: ReceiveInput['items'] = [];
      for (const item of open) {
        const qty = (quantities[item.id] ?? '').trim().replace(',', '.') || '0';
        const bad = (damaged[item.id] ?? '').trim().replace(',', '.') || '0';
        // Decimals for measured items (kg, m, l); the server checks each unit's precision
        if (!QUANTITY_TEXT.test(qty) || !QUANTITY_TEXT.test(bad)) {
          throw new Error(t('Enter a quantity of 0 or more (up to 4 decimals) for {sku}.', { sku: item.sku }));
        }
        if (Number(qty) === 0 && Number(bad) === 0) continue;
        const cost = Number(costs[item.id]);
        if (isNaN(cost) || cost < 0) throw new Error(t('Enter a valid unit cost for {sku}.', { sku: item.sku }));
        items.push({
          purchaseOrderItemId: item.id,
          quantity: Number(qty),
          ...(bad !== '0' && { damagedQuantity: Number(bad), damagedAccepted: !!accepted[item.id] }),
          ...(cost !== netUnitCost(item) && { unitCost: cost }),
        });
      }
      if (items.length === 0) throw new Error(t('Enter at least one received quantity.'));
      const input = {
        idempotencyKey,
        items,
        ...(reference.trim() && { reference: reference.trim() }),
      };
      // More than the over-receipt tolerance: someone with "Approve purchase orders" authorises it
      const result = await withApproval((headers) => purchaseOrdersApi.receive(order.id, input, headers));
      return { result, detail: await purchaseOrdersApi.get(order.id) };
    },
    onMutate: () => setError(null),
    onSuccess: ({ result, detail }) =>
      onReceived(
        detail,
        result.duplicate
          ? t('This delivery was already recorded as {number}; nothing was added twice.', {
              number: result.receipt.receiptNumber,
            })
          : t("Received as {number}. Stock was added at the order's location.", {
              number: result.receipt.receiptNumber,
            })
      ),
    onError: (err) =>
      setError(
        err instanceof Error && !('response' in err) ? err.message : getErrorMessage(err, 'Could not receive the goods')
      ),
  });

  const overReceived = open.filter((i) => intoStock(i) > outstanding(i));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        receive.mutate();
      }}
    >
      <ErrorMessage>{error}</ErrorMessage>
      <p className="text-sm text-gray-500">
        {t('Enter what arrived. Anything left is still outstanding and can be received later.')}{' '}
        {t('Damaged units go into stock only if you accept them; rejected ones are recorded without stock.')}
      </p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">{t('Product')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('Outstanding')}</th>
              <th className="w-24 px-3 py-2 font-medium">{t('Received now')}</th>
              <th className="w-24 px-3 py-2 font-medium">{t('Damaged')}</th>
              <th className="w-28 px-3 py-2 font-medium">{t('Unit cost ({currency})', { currency })}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {open.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-2">
                  <div className="font-medium">{item.productName}</div>
                  <div className="font-mono text-xs text-gray-500">{item.sku}</div>
                </td>
                <td className="px-3 py-2 text-right">{outstanding(item)}</td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="numeric"
                    value={quantities[item.id] ?? ''}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    aria-label={t('Received quantity for {sku}', { sku: item.sku })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={damaged[item.id] ?? ''}
                    onChange={(e) => setDamaged((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    aria-label={t('Damaged quantity for {sku}', { sku: item.sku })}
                  />
                  {Number(damaged[item.id]) > 0 && (
                    <CheckboxField
                      label={t('Accept into stock')}
                      checked={!!accepted[item.id]}
                      onChange={(e) => setAccepted((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                      aria-label={t('Accept damaged units of {sku}', { sku: item.sku })}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <Input
                    inputMode="decimal"
                    value={costs[item.id] ?? ''}
                    onChange={(e) => setCosts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    aria-label={t('Unit cost for {sku}', { sku: item.sku })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {overReceived.length > 0 && (
        <p className="rounded-md bg-orange-50 p-3 text-sm text-orange-800">
          {t(
            'More than ordered for {skus}. Within the store’s over-receipt tolerance this is accepted; beyond it, someone with "Approve purchase orders" must authorise it.',
            { skus: overReceived.map((i) => i.sku).join(', ') }
          )}
        </p>
      )}
      <Field label={t('Delivery note / invoice number')} htmlFor="receipt-reference">
        <Input id="receipt-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <p className="text-xs text-gray-500">
        {t('Total of this delivery:')}{' '}
        {formatMoney(
          open.reduce((sum, i) => sum + intoStock(i) * (Number(costs[i.id]) || 0), 0),
          currency
        )}
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={receive.isPending}>
          {t('Back')}
        </Button>
        <Button type="submit" disabled={receive.isPending} className="bg-blue-600 text-white hover:bg-blue-700">
          {receive.isPending ? t('Receiving...') : t('Receive')}
        </Button>
      </DialogFooter>
    </form>
  );
}

// The title holds user-entered text (supplier name, order number)
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/**
 * Print one element in its own window (with the app's stylesheets), so the
 * admin layout and dialog chrome are not printed
 */
function printElement(elementId: string, title: string) {
  const node = document.getElementById(elementId);
  const win = node ? window.open('', '_blank', 'width=900,height=1000') : null;
  if (!node || !win) {
    window.print();
    return;
  }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('');
  win.document.write(
    `<!doctype html><html><head><base href="${window.location.origin}/"><title>${escapeHtml(title)}</title>${styles}</head>` +
      `<body style="background:white;padding:24px">${node.outerHTML}</body></html>`
  );
  win.document.close();
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.print();
  };
  win.addEventListener('load', print);
  // Stylesheets may already be cached (no load event after close())
  setTimeout(print, 800);
}

/**
 * Printable purchase order (printed in its own window)
 */
function PurchaseOrderPrintView({
  order,
  locationLabel,
  onClose,
}: {
  order: PurchaseOrderDetail;
  locationLabel: string;
  onClose: () => void;
}) {
  const { data: settings } = useStoreSettings();
  const currency = order.currencyCode;
  const supplier = order.supplier;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Print {number}', { number: order.poNumber })}</DialogTitle>
          <DialogDescription>{t('Preview of the order as it will be printed or saved as PDF.')}</DialogDescription>
        </DialogHeader>
        <div id="po-print" className="space-y-6 text-sm text-black">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xl font-bold">{settings?.storeName ?? t('Purchase order')}</div>
              <div className="text-gray-600">{t('Deliver to: {location}', { location: locationLabel })}</div>
              {order.warehouse?.addressLine1 && (
                <div className="text-gray-600">
                  {order.warehouse.addressLine1}
                  {order.warehouse.city && `, ${order.warehouse.city}`}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{t('PURCHASE ORDER')}</div>
              <div className="font-mono">{order.poNumber}</div>
              <div>{t('Date: {date}', { date: formatDate(order.issuedAt ?? order.createdAt) })}</div>
              {order.expectedDeliveryDate && <div>{t('Expected: {date}', { date: formatDate(order.expectedDeliveryDate) })}</div>}
              {order.supplierReference && (
                <div>{t('Supplier reference: {reference}', { reference: order.supplierReference })}</div>
              )}
              {(order.revisionNumber ?? 0) > 0 && (
                <div>{t('Revision {number}', { number: order.revisionNumber })}</div>
              )}
            </div>
          </div>

          {supplier && (
            <div>
              <div className="font-semibold">{t('Supplier')}</div>
              <div>{supplier.name}</div>
              {supplier.addressLine1 && <div>{supplier.addressLine1}</div>}
              {(supplier.city || supplier.postalCode) && (
                <div>{[supplier.postalCode, supplier.city, supplier.countryCode].filter(Boolean).join(' ')}</div>
              )}
              {supplier.email && <div>{supplier.email}</div>}
              {supplier.taxNumber && <div>{t('Tax no. {number}', { number: supplier.taxNumber })}</div>}
              {supplier.paymentTermDays != null && <div>{t('Payment terms: net {count} days', { count: supplier.paymentTermDays })}</div>}
            </div>
          )}

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-1">#</th>
                <th className="py-1">{t('SKU')}</th>
                <th className="py-1">{t('Description')}</th>
                <th className="py-1 text-right">{t('Qty')}</th>
                <th className="py-1 text-right">{t('Unit cost')}</th>
                <th className="py-1 text-right">{t('Total')}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-1">{item.lineNumber}</td>
                  <td className="py-1 font-mono text-xs">{item.supplierSku || item.sku}</td>
                  <td className="py-1">
                    {item.productName}
                    {item.unitOfMeasure && <span className="text-gray-600"> ({item.unitOfMeasure})</span>}
                  </td>
                  <td className="py-1 text-right">{item.quantityOrdered}</td>
                  <td className="py-1 text-right">
                    {formatMoney(item.unitCost, currency)}
                    {Number(item.discountPercent ?? 0) > 0 && ` −${Number(item.discountPercent)}%`}
                  </td>
                  <td className="py-1 text-right">{formatMoney(item.total, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="py-1 text-right">
                  {t('Subtotal')}
                </td>
                <td className="py-1 text-right">{formatMoney(order.subtotal, currency)}</td>
              </tr>
              {order.taxAmount > 0 && (
                <tr>
                  <td colSpan={5} className="py-1 text-right">
                    {t('Tax')}
                  </td>
                  <td className="py-1 text-right">{formatMoney(order.taxAmount, currency)}</td>
                </tr>
              )}
              {order.shippingCost > 0 && (
                <tr>
                  <td colSpan={5} className="py-1 text-right">
                    {t('Shipping')}
                  </td>
                  <td className="py-1 text-right">{formatMoney(order.shippingCost, currency)}</td>
                </tr>
              )}
              <tr className="font-bold">
                <td colSpan={5} className="py-1 text-right">
                  {t('Total ({currency})', { currency })}
                </td>
                <td className="py-1 text-right">{formatMoney(order.total, currency)}</td>
              </tr>
            </tfoot>
          </table>

          {order.notes && (
            <div>
              <div className="font-semibold">{t('Notes')}</div>
              <div className="whitespace-pre-wrap">{order.notes}</div>
            </div>
          )}
          <div className="text-gray-600">
            {t('Approved by: {name}', {
              name: order.approvedByName ?? (order.approvedAt ? t('automatic (below threshold)') : '—'),
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Back')}
          </Button>
          <Button onClick={() => printElement('po-print', order.poNumber)}>
            <Printer className="h-4 w-4" />
            {t('Print')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
