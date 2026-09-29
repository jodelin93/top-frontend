'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Settings2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { useApproval } from '@/components/approval-dialog';
import { CheckboxField } from '@/components/admin/settings-shared';
import {
  InventoryLine,
  InventoryLineList,
  newInventoryLine,
  useStockLocationOptions,
  VariantPicker,
} from '@/components/admin/inventory-variant-picker';
import {
  defaultReceiveEntry,
  inTransit,
  planReceive,
  ReceiveEntry,
  ReceiveLinesTable,
  remainingToDispatch,
  transferItemLabel as itemLabel,
} from '@/components/admin/inventory-transfer-receive';
import { TransferSettingsDialog, useTransferSettings } from '@/components/admin/inventory-transfer-settings';
import { useCurrency } from '@/hooks/use-store-settings';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { getErrorMessage } from '@/lib/api/client';
import { StockTransfer, TransferEvent, TransferStatus, transfersApi } from '@/lib/api/inventory';
import { formatDateTime, formatMoney } from '@/lib/format';
import { plural, t } from '@/i18n';
import { QUANTITY_TEXT } from '@/lib/pos/quantity';
import { randomId } from '@/lib/uuid';

export const transferStatusLabels: Record<TransferStatus, string> = {
  draft: 'Draft',
  requested: 'Awaiting approval',
  approved: 'Approved',
  partially_dispatched: 'Partly dispatched',
  in_transit: 'In transit',
  partially_received: 'Partly received',
  received: 'Received',
  cancelled: 'Cancelled',
};

const transferStatusVariant: Record<TransferStatus, 'default' | 'info' | 'warning' | 'success'> = {
  draft: 'default',
  requested: 'warning',
  approved: 'info',
  partially_dispatched: 'info',
  in_transit: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'default',
};

const eventLabels: Record<TransferEvent['kind'], string> = {
  dispatch: 'Dispatched',
  receipt: 'Received',
  write_off: 'Written off',
  return: 'Returned to source',
};

// A fresh key per dispatch / receive dialog: a retry or double-click posts nothing twice
const newIdempotencyKey = () =>
  randomId();

/**
 * Stock transfers between locations: draft → (approval) → dispatched, possibly
 * in several goes (in transit) → received, with damaged / missing units.
 */
export function TransfersTab() {
  const { options: locations, labelFor } = useStockLocationOptions();
  const user = useAuthStore((s) => s.user);
  const canTransfer = hasPermission(user, 'inventory.transfer');
  const canManageSettings = hasPermission(user, 'settings.manage');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<TransferStatus | ''>('');
  const [editing, setEditing] = useState<StockTransfer | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const smallScreen = useSmallScreen();

  const {
    data: transfers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['inventory', 'transfers', status],
    queryFn: () => transfersApi.list({ status: status || undefined }),
  });

  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {t('Move stock between locations. Dispatched units are in transit until the destination receives them.')}
        </p>
        <div className="flex flex-wrap gap-2">
          {canManageSettings && (
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />
              {t('Transfer settings')}
            </Button>
          )}
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TransferStatus | '')}
            className="sm:w-44"
            aria-label={t('Filter by status')}
          >
            <option value="">{t('All statuses')}</option>
            {Object.entries(transferStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
          {canTransfer && (
            <Button
              onClick={() => setEditing('new')}
              disabled={locations.length < 2}
              title={locations.length < 2 ? t('You need at least two stock locations') : undefined}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t('New transfer')}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="m-4">
          <ErrorMessage>{getErrorMessage(error, 'Could not load transfers')}</ErrorMessage>
        </div>
      )}

      {smallScreen ? (
        // Phones: one card per transfer
        <DataCards
          items={transfers}
          getKey={(transfer) => transfer.id}
          onItemClick={(transfer) => setOpenId(transfer.id)}
          loading={isLoading}
          loadingText={t('Loading transfers...')}
          emptyText={t('No transfers yet.')}
        >
          {(transfer) => (
            <>
              <DataCardHeader
                title={<span className="font-mono text-xs">{transfer.transferNumber}</span>}
                onTitleClick={() => setOpenId(transfer.id)}
                badge={
                  <Badge variant={transferStatusVariant[transfer.status]}>
                    {t(transferStatusLabels[transfer.status])}
                  </Badge>
                }
              />
              <DataCardFields>
                <DataCardField label={t('From → to')} full>
                  {labelFor(transfer.fromLocationId)} <ArrowRight className="inline h-3 w-3" />{' '}
                  {labelFor(transfer.toLocationId)}
                </DataCardField>
                <DataCardField label={t('Lines')}>{transfer.items?.length ?? 0}</DataCardField>
                <DataCardField label={t('Created')}>{formatDateTime(transfer.createdAt)}</DataCardField>
                {transfer.dispatchedAt && (
                  <DataCardField label={t('Dispatched')}>{formatDateTime(transfer.dispatchedAt)}</DataCardField>
                )}
              </DataCardFields>
            </>
          )}
        </DataCards>
      ) : (
      <Table>
        <THead>
          <tr>
            <Th>{t('Transfer')}</Th>
            <Th>{t('From → to')}</Th>
            <Th>{t('Status')}</Th>
            <Th className="text-right">{t('Lines')}</Th>
            <Th>{t('Created')}</Th>
            <Th>{t('Dispatched')}</Th>
          </tr>
        </THead>
        <TBody>
          {isLoading ? (
            <EmptyRow colSpan={6}>{t('Loading transfers...')}</EmptyRow>
          ) : transfers.length === 0 ? (
            <EmptyRow colSpan={6}>{t('No transfers yet.')}</EmptyRow>
          ) : (
            transfers.map((transfer) => (
              <tr key={transfer.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setOpenId(transfer.id)}>
                <Td className="font-mono text-xs font-medium">{transfer.transferNumber}</Td>
                <Td>
                  {labelFor(transfer.fromLocationId)} <ArrowRight className="inline h-3 w-3" />{' '}
                  {labelFor(transfer.toLocationId)}
                </Td>
                <Td>
                  <Badge variant={transferStatusVariant[transfer.status]}>
                    {t(transferStatusLabels[transfer.status])}
                  </Badge>
                </Td>
                <Td className="text-right">{transfer.items?.length ?? 0}</Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(transfer.createdAt)}</Td>
                <Td className="whitespace-nowrap text-gray-600">{formatDateTime(transfer.dispatchedAt)}</Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
      )}

      {settingsOpen && <TransferSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {editing && (
        <TransferFormDialog
          transfer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(transfer) => {
            setEditing(null);
            setOpenId(transfer.id);
          }}
        />
      )}
      {openId && (
        <TransferDetailDialog
          id={openId}
          onClose={() => setOpenId(null)}
          onEdit={(transfer) => {
            setOpenId(null);
            setEditing(transfer);
          }}
        />
      )}
    </Card>
  );
}

function TransferFormDialog({
  transfer,
  onClose,
  onSaved,
}: {
  transfer: StockTransfer | null;
  onClose: () => void;
  onSaved: (transfer: StockTransfer) => void;
}) {
  const queryClient = useQueryClient();
  const { options: locations } = useStockLocationOptions();
  const [fromLocationId, setFrom] = useState(transfer?.fromLocationId ?? locations[0]?.id ?? '');
  const [toLocationId, setTo] = useState(transfer?.toLocationId ?? locations[1]?.id ?? '');
  const [notes, setNotes] = useState(transfer?.notes ?? '');
  const [lines, setLines] = useState<InventoryLine[]>(
    (transfer?.items ?? []).map((item) => ({
      variantId: item.variantId,
      label: itemLabel(item),
      sku: item.variant?.sku ?? '',
      quantity: String(item.quantityRequested),
      cost: '',
    }))
  );
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: Parameters<typeof transfersApi.create>[0]) =>
      transfer ? transfersApi.update(transfer.id, input) : transfersApi.create(input),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
      onSaved(saved);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not save the transfer')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fromLocationId || !toLocationId) return setError(t('Choose both locations.'));
    if (fromLocationId === toLocationId) return setError(t('The two locations must differ.'));
    if (lines.length === 0) return setError(t('Add at least one product.'));
    const items: { variantId: string; quantity: number }[] = [];
    for (const line of lines) {
      if (!/^\d+$/.test(line.quantity.trim()) || Number(line.quantity) < 1) {
        return setError(t('Enter a whole quantity of at least 1 for {sku}.', { sku: line.sku }));
      }
      items.push({ variantId: line.variantId, quantity: Number(line.quantity) });
    }
    save.mutate({ fromLocationId, toLocationId, notes: notes.trim() || null, items });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{transfer ? t('Edit {number}', { number: transfer.transferNumber }) : t('New transfer')}</DialogTitle>
          <DialogDescription>
            {t('Saved as a draft. Stock only moves when you dispatch it, and the source must have it available.')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorMessage>{error}</ErrorMessage>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t('Origin')} htmlFor="transfer-from">
              <Select id="transfer-from" value={fromLocationId} onChange={(e) => setFrom(e.target.value)}>
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('Destination')} htmlFor="transfer-to">
              <Select id="transfer-to" value={toLocationId} onChange={(e) => setTo(e.target.value)}>
                <option value="">{t('Choose a location...')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <VariantPicker
            excludeIds={new Set(lines.map((l) => l.variantId))}
            renderAction={(product, variant) => (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((prev) => [...prev, newInventoryLine(product, variant, '1')])}
              >
                <Plus className="h-3 w-3" />
                {t('Add')}
              </Button>
            )}
          />
          <InventoryLineList lines={lines} onChange={setLines} quantityLabel={t('Quantity')} />
          <Field label={t('Notes')} htmlFor="transfer-notes">
            <Textarea id="transfer-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t('Saving...') : t('Save draft')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Step = 'dispatch' | 'receive' | 'writeOff';
type Action = Step | 'request' | 'approve' | 'reject' | 'cancel';

// Units have left the source: receipts, write-offs are possible
const DISPATCHED: TransferStatus[] = ['partially_dispatched', 'in_transit', 'partially_received'];
const DISPATCHABLE: TransferStatus[] = ['approved', 'partially_dispatched'];
const CANCELLABLE: TransferStatus[] = ['draft', 'requested', 'approved', ...DISPATCHED];

function TransferDetailDialog({
  id,
  onClose,
  onEdit,
}: {
  id: string;
  onClose: () => void;
  onEdit: (transfer: StockTransfer) => void;
}) {
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const { labelFor } = useStockLocationOptions();
  const settings = useTransferSettings();
  const user = useAuthStore((s) => s.user);
  const canTransfer = hasPermission(user, 'inventory.transfer');
  const canApprove = hasPermission(user, 'inventory.transfer.approve');
  // Quantities per line for the step being prepared
  const [step, setStep] = useState<Step | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<Record<string, ReceiveEntry>>({});
  // Last dispatch: what is not sent is dropped
  const [complete, setComplete] = useState(false);
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  // Why the written-off units will never arrive (required)
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Write-offs, approvals and over-receipts: a manager's approval when the user lacks the permission
  const { withApproval, approvalDialog } = useApproval();
  const smallScreen = useSmallScreen();

  const { data: transfer, error: loadError } = useQuery({
    queryKey: ['inventory', 'transfers', 'detail', id],
    queryFn: () => transfersApi.get(id),
  });

  const lineQuantities = (limit: (itemId: string) => number) => {
    const items = Object.entries(quantities).map(([itemId, value]) => ({
      itemId,
      quantity: Number(value.trim().replace(',', '.') || '0'),
    }));
    // Decimals for measured items; the server checks each unit's precision
    if (items.some((i) => !QUANTITY_TEXT.test(String(i.quantity)))) {
      throw new Error(t('Quantities must be 0 or more, with at most 4 decimals.'));
    }
    const tooMany = items.find((i) => i.quantity > limit(i.itemId));
    if (tooMany) {
      const item = transfer?.items.find((it) => it.id === tooMany.itemId);
      throw new Error(
        t('Only {count} unit(s) possible for {sku}.', { count: limit(tooMany.itemId), sku: item?.variant?.sku })
      );
    }
    if (items.every((i) => i.quantity === 0)) throw new Error(t('Enter at least one quantity.'));
    return items.filter((i) => i.quantity > 0);
  };

  const run = useMutation({
    mutationFn: async ({ kind, reason: why }: { kind: Action; reason?: string }) => {
      const byId = new Map((transfer?.items ?? []).map((item) => [item.id, item]));
      const note = notes.trim() || undefined;
      switch (kind) {
        case 'request':
          return transfersApi.request(id);
        case 'approve':
          return withApproval((headers) => transfersApi.approve(id, headers));
        case 'reject':
          return withApproval((headers) => transfersApi.reject(id, why, headers));
        case 'cancel':
          return transfersApi.cancel(id, why);
        case 'dispatch': {
          const items = lineQuantities((itemId) => {
            const item = byId.get(itemId);
            return item ? remainingToDispatch(item) : 0;
          });
          return transfersApi.dispatch(id, { items, notes: note, idempotencyKey, ...(complete && { complete }) });
        }
        case 'receive': {
          const plan = planReceive(transfer?.items ?? [], receipt, settings.transferOverReceiptTolerancePercent);
          if ('error' in plan) throw new Error(plan.error);
          return withApproval((headers) =>
            transfersApi.receive(id, { items: plan.lines, notes: note, idempotencyKey }, headers)
          );
        }
        case 'writeOff': {
          const items = lineQuantities((itemId) => {
            const item = byId.get(itemId);
            return item ? inTransit(item) : 0;
          });
          const text = reason.trim();
          if (!text) throw new Error(t('Enter why these units will never arrive.'));
          return withApproval((headers) => transfersApi.writeOff(id, { items, reason: text, notes: note }, headers));
        }
      }
    },
    onMutate: () => setError(null),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['inventory', 'transfers', 'detail', id], updated);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setStep(null);
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not update the transfer')),
  });

  // Default quantities per line for a step: everything still possible
  const prepare = (next: Step) => {
    if (!transfer) return;
    setQuantities(
      Object.fromEntries(
        transfer.items.map((item) => [
          item.id,
          String(next === 'dispatch' ? remainingToDispatch(item) : next === 'writeOff' ? (item.quantityMissing ?? 0) : 0),
        ])
      )
    );
    setReceipt(Object.fromEntries(transfer.items.map((item) => [item.id, defaultReceiveEntry(item)])));
    setComplete(false);
    setNotes('');
    setReason('');
    setIdempotencyKey(newIdempotencyKey());
    setError(null);
    setStep(next);
  };

  const askCancel = () => {
    if (!transfer) return;
    const shipped = DISPATCHED.includes(transfer.status);
    const message = shipped
      ? t(
          'Cancel this transfer? Units still in transit go back to {from}; units already received stay at {to}. Reason (optional):',
          { from: labelFor(transfer.fromLocationId), to: labelFor(transfer.toLocationId) }
        )
      : t('Cancel this transfer? Nothing has been dispatched yet. Reason (optional):');
    const why = window.prompt(message, '');
    if (why === null) return;
    run.mutate({ kind: 'cancel', reason: why.trim() || undefined });
  };

  const askReject = () => {
    const why = window.prompt(t('Send this transfer back to draft? Reason (optional):'), '');
    if (why === null) return;
    run.mutate({ kind: 'reject', reason: why.trim() || undefined });
  };

  const status = transfer?.status;
  const items = transfer?.items ?? [];
  const shipped = !!status && DISPATCHED.includes(status);
  const needsApprovalFirst = settings.transferApprovalMode !== 'never';
  const canDispatch =
    canTransfer && !!status && (DISPATCHABLE.includes(status) || (status === 'draft' && !needsApprovalFirst));
  const busy = run.isPending;
  const any = (pick: (item: (typeof items)[number]) => number | undefined) => items.some((i) => (pick(i) ?? 0) > 0);
  const showDamaged = any((i) => i.quantityDamaged);
  const showMissing = any((i) => i.quantityMissing);
  const showReturned = any((i) => i.quantityReturned);
  const showOver = any((i) => i.quantityOverReceived);
  const skuOf = new Map(items.map((item) => [item.id, item.variant?.sku ?? '']));
  const skuByVariant = new Map(items.map((item) => [item.variantId, item.variant?.sku ?? '']));

  // Units for the step being prepared (the same box in the table and the phone cards)
  const quantityInput = (item: (typeof items)[number], className?: string) => (
    <Input
      inputMode="numeric"
      value={quantities[item.id] ?? ''}
      onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
      aria-label={t('Quantity for {sku}', { sku: item.variant?.sku })}
      className={className}
    />
  );

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {transfer ? t('Transfer {number}', { number: transfer.transferNumber }) : t('Transfer')}
              {transfer && (
                <Badge variant={transferStatusVariant[transfer.status]}>{t(transferStatusLabels[transfer.status])}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {transfer
                ? `${labelFor(transfer.fromLocationId)} → ${labelFor(transfer.toLocationId)}${
                    transfer.notes ? ` · ${transfer.notes}` : ''
                  }`
                : t('Loading...')}
            </DialogDescription>
          </DialogHeader>

          <ErrorMessage>
            {error ?? (loadError ? getErrorMessage(loadError, 'Could not load the transfer') : null)}
          </ErrorMessage>
          {status === 'requested' && !step && (
            <p className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
              {t(
                'This transfer needs approval before it is dispatched. Someone other than the requester with "Approve stock transfers and over-receipts" must approve it.'
              )}
            </p>
          )}
          {status === 'draft' && needsApprovalFirst && !step && (
            <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              {settings.transferApprovalMode === 'always'
                ? t('Transfers need approval before dispatch: submit it for approval.')
                : t(
                    'Transfers worth more than {amount} at cost need approval before dispatch. Submit it: below that it is approved at once.',
                    { amount: formatMoney(settings.transferApprovalThreshold, currency) }
                  )}
            </p>
          )}
          {step && (
            <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              {
                {
                  dispatch: t(
                    'Enter how many units leave the source now. They are taken off its stock immediately (only what it has available). You can dispatch the rest later.'
                  ),
                  receive: t(
                    'Enter what arrived in good condition, what arrived damaged (kept apart, not sellable) and what is missing. Missing units stay in transit until they turn up or are written off.'
                  ),
                  writeOff: t(
                    'Enter the units that will never arrive (lost or damaged in transit). They are recorded as a stock loss.'
                  ),
                }[step]
              }
            </p>
          )}
          {step === 'writeOff' && (
            <Field label={t('Reason (required)')}>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={t('e.g. Box lost by the courier')}
              />
            </Field>
          )}

          {step === 'receive' ? (
            <ReceiveLinesTable
              items={items}
              entries={receipt}
              onChange={setReceipt}
              tolerancePercent={settings.transferOverReceiptTolerancePercent}
            />
          ) : smallScreen ? (
            // Phones: one card per line, the quantity box in view
            <div className="space-y-2">
              {items.map((item) => {
                const figures: [string, React.ReactNode, boolean][] = [
                  [t('Requested'), item.quantityRequested, true],
                  [t('Dispatched'), item.quantityDispatched, true],
                  [t('In transit'), inTransit(item) || '—', true],
                  [t('Received'), item.quantityReceived, true],
                  [t('Damaged'), item.quantityDamaged ?? 0, showDamaged],
                  [t('Missing'), item.quantityMissing ?? 0, showMissing],
                  [t('Written off'), item.quantityWrittenOff, true],
                  [t('Returned'), item.quantityReturned ?? 0, showReturned],
                  [t('Over-received'), item.quantityOverReceived ?? 0, showOver],
                  [t('Unit cost'), item.unitCost == null ? '—' : formatMoney(item.unitCost, currency), true],
                ];
                return (
                  <div key={item.id} className="space-y-2 rounded-md border p-3 text-sm">
                    <div>
                      <div className="font-medium">{itemLabel(item)}</div>
                      <div className="font-mono text-xs text-gray-500">{item.variant?.sku}</div>
                    </div>
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-1">
                      {figures
                        .filter(([, , shown]) => shown)
                        .map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-gray-500">{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                    {step && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t('Now')}</span>
                        {quantityInput(item, 'h-10 w-28 text-right')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('Product')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Requested')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Dispatched')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('In transit')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('Received')}</th>
                    {showDamaged && <th className="px-3 py-2 text-right font-medium">{t('Damaged')}</th>}
                    {showMissing && <th className="px-3 py-2 text-right font-medium">{t('Missing')}</th>}
                    <th className="px-3 py-2 text-right font-medium">{t('Written off')}</th>
                    {showReturned && <th className="px-3 py-2 text-right font-medium">{t('Returned')}</th>}
                    {showOver && <th className="px-3 py-2 text-right font-medium">{t('Over-received')}</th>}
                    <th className="px-3 py-2 text-right font-medium">{t('Unit cost')}</th>
                    {step && <th className="w-28 px-3 py-2 font-medium">{t('Now')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{itemLabel(item)}</div>
                        <div className="font-mono text-xs text-gray-500">{item.variant?.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantityRequested}</td>
                      <td className="px-3 py-2 text-right">{item.quantityDispatched}</td>
                      <td className="px-3 py-2 text-right">{inTransit(item) || '—'}</td>
                      <td className="px-3 py-2 text-right">{item.quantityReceived}</td>
                      {showDamaged && <td className="px-3 py-2 text-right">{item.quantityDamaged ?? 0}</td>}
                      {showMissing && <td className="px-3 py-2 text-right">{item.quantityMissing ?? 0}</td>}
                      <td className="px-3 py-2 text-right">{item.quantityWrittenOff}</td>
                      {showReturned && <td className="px-3 py-2 text-right">{item.quantityReturned ?? 0}</td>}
                      {showOver && <td className="px-3 py-2 text-right">{item.quantityOverReceived ?? 0}</td>}
                      <td className="px-3 py-2 text-right text-gray-600">
                        {item.unitCost == null ? '—' : formatMoney(item.unitCost, currency)}
                      </td>
                      {step && <td className="px-3 py-2">{quantityInput(item)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {step === 'dispatch' && (
            <CheckboxField
              label={t('This is the last dispatch')}
              hint={t('Units not sent now are dropped from the transfer. Leave unticked to dispatch the rest later.')}
              checked={complete}
              onChange={(e) => setComplete(e.target.checked)}
            />
          )}
          {(step === 'dispatch' || step === 'receive') && (
            <Field label={t('Notes')} htmlFor="transfer-step-notes">
              <Textarea
                id="transfer-step-notes"
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          )}

          {transfer && !step && (
            <p className="text-xs text-gray-500">
              {t('Created {date}', { date: formatDateTime(transfer.createdAt) })}
              {transfer.requestedAt && ` · ${t('submitted {date}', { date: formatDateTime(transfer.requestedAt) })}`}
              {transfer.approvedAt && ` · ${t('approved {date}', { date: formatDateTime(transfer.approvedAt) })}`}
              {transfer.dispatchedAt && ` · ${t('dispatched {date}', { date: formatDateTime(transfer.dispatchedAt) })}`}
              {transfer.receivedAt && ` · ${t('completed {date}', { date: formatDateTime(transfer.receivedAt) })}`}
              {transfer.cancelledAt && ` · ${t('cancelled {date}', { date: formatDateTime(transfer.cancelledAt) })}`}
            </p>
          )}

          {!step && (transfer?.events?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium">{t('History')}</h3>
              <ul className="divide-y rounded-md border text-sm">
                {transfer!.events!.map((event) => (
                  <li key={event.id} className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
                    <span className="w-36 shrink-0 whitespace-nowrap text-gray-500">{formatDateTime(event.createdAt)}</span>
                    <Badge className="w-fit shrink-0">{t(eventLabels[event.kind] ?? event.kind)}</Badge>
                    <span className="flex-1 text-gray-700">
                      {event.lines
                        .map((line) => {
                          const sku = (line.itemId && skuOf.get(line.itemId)) || skuByVariant.get(line.variantId ?? '') || '';
                          const extra = [
                            line.damaged ? t('{count} damaged', { count: line.damaged }) : null,
                            line.missing ? t('{count} missing', { count: line.missing }) : null,
                          ].filter(Boolean);
                          return `${sku} ×${line.quantity ?? 0}${extra.length ? ` (${extra.join(', ')})` : ''}`;
                        })
                        .join(' · ') || '—'}
                      {event.notes && <span className="block text-xs text-gray-500">{event.notes}</span>}
                      {event.approverId && (
                        <span className="block text-xs text-amber-700">{t('Approved by a manager')}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canTransfer && status && CANCELLABLE.includes(status) && !step && (
                <Button variant="outline" className="text-red-600" disabled={busy} onClick={askCancel}>
                  {t('Cancel transfer')}
                </Button>
              )}
              {canTransfer && status === 'draft' && !step && (
                <Button variant="outline" disabled={busy} onClick={() => transfer && onEdit(transfer)}>
                  {t('Edit')}
                </Button>
              )}
              {canTransfer && shipped && !step && (
                <Button variant="outline" disabled={busy} onClick={() => prepare('writeOff')}>
                  {t('Write off missing')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {step ? (
                <>
                  <Button variant="outline" disabled={busy} onClick={() => setStep(null)}>
                    {t('Back')}
                  </Button>
                  <Button
                    disabled={busy || (step === 'writeOff' && !reason.trim())}
                    onClick={() => run.mutate({ kind: step })}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {{ dispatch: t('Dispatch'), receive: t('Receive'), writeOff: t('Write off') }[step]}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} disabled={busy}>
                    {t('Close')}
                  </Button>
                  {canTransfer && status === 'draft' && needsApprovalFirst && (
                    <Button
                      disabled={busy}
                      onClick={() => run.mutate({ kind: 'request' })}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {t('Submit for approval')}
                    </Button>
                  )}
                  {(canTransfer || canApprove) && status === 'requested' && (
                    <>
                      <Button variant="outline" disabled={busy} onClick={askReject}>
                        {t('Send back')}
                      </Button>
                      <Button
                        disabled={busy}
                        onClick={() => run.mutate({ kind: 'approve' })}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        {t('Approve')}
                      </Button>
                    </>
                  )}
                  {canDispatch && (
                    <Button
                      variant={shipped ? 'outline' : 'default'}
                      onClick={() => prepare('dispatch')}
                      className={shipped ? undefined : 'bg-blue-600 text-white hover:bg-blue-700'}
                    >
                      {status === 'partially_dispatched' ? t('Dispatch more...') : t('Dispatch...')}
                    </Button>
                  )}
                  {canTransfer && shipped && (
                    <Button onClick={() => prepare('receive')} className="bg-blue-600 text-white hover:bg-blue-700">
                      {t('Receive...')}
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
          {transfer && shipped && !step && (
            <p className="text-xs text-gray-500">
              {plural(
                items.reduce((sum, item) => sum + inTransit(item), 0),
                '{count} unit is in transit.',
                '{count} units are in transit.'
              )}
            </p>
          )}
        </DialogContent>
      </Dialog>
      {approvalDialog}
    </>
  );
}
