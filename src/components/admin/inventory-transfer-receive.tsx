'use client';

import { Input } from '@/components/ui/input';
import { text } from '@/lib/api/crud';
import type { TransferItem, TransferReceiptLine } from '@/lib/api/inventory';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { addQty, QUANTITY_TEXT, subQty } from '@/lib/pos/quantity';

// ---- Transfer line math (mirrors the server's transfer rules) ----

// Dispatched units that have not arrived (good or damaged), been written off or
// gone back to the source. Units reported missing are still in transit.
export const inTransit = (item: TransferItem) =>
  item.quantityInTransit ??
  subQty(
    item.quantityDispatched,
    addQty(item.quantityReceived, item.quantityDamaged ?? 0, item.quantityWrittenOff, item.quantityReturned ?? 0)
  );

// Requested units not dispatched yet
export const remainingToDispatch = (item: TransferItem) =>
  Math.max(0, item.quantityRequested - item.quantityDispatched);

/**
 * Over-receipt allowed without approval on a line: tolerance % of what was
 * dispatched, minus what was already over-received
 */
export function overReceiptAllowance(item: TransferItem, tolerancePercent: number) {
  const over = item.quantityOverReceived ?? 0;
  const dispatched = item.quantityDispatched - over;
  return Math.max(0, Math.floor((dispatched * Math.max(0, tolerancePercent)) / 100) - over);
}

export const transferItemLabel = (item: TransferItem) => {
  const product = text(item.variant?.product?.name, item.variant?.sku ?? '');
  const variant = text(item.variant?.name);
  return variant && variant !== product ? `${product} — ${variant}` : product;
};

// ---- Receipt entry ----

export interface ReceiveEntry {
  good: string;
  damaged: string;
  missing: string;
}

// Default: whatever is in transit and not already reported missing arrives in good condition
export const defaultReceiveEntry = (item: TransferItem): ReceiveEntry => ({
  good: String(Math.max(0, inTransit(item) - (item.quantityMissing ?? 0))),
  damaged: '',
  missing: '',
});

export interface ReceivePlan {
  lines: TransferReceiptLine[];
  // Units arriving above what is in transit, per item
  over: Record<string, number>;
  // Some over-receipt is above the store's tolerance: a manager must approve
  needsApproval: boolean;
}

/**
 * Check a receipt: per line good + damaged + missing may not exceed what is in
 * transit, unless more arrived than was sent (an over-receipt, then nothing can
 * be missing). Returns the request lines, or an error message.
 */
export function planReceive(
  items: TransferItem[],
  entries: Record<string, ReceiveEntry>,
  tolerancePercent = 0
): ReceivePlan | { error: string } {
  const lines: TransferReceiptLine[] = [];
  const over: Record<string, number> = {};
  let needsApproval = false;
  for (const item of items) {
    const entry = entries[item.id];
    if (!entry) continue;
    const sku = item.variant?.sku ?? '';
    const values = [entry.good, entry.damaged, entry.missing].map((v) => v.trim().replace(',', '.') || '0');
    if (values.some((v) => !QUANTITY_TEXT.test(v))) {
      return { error: t('Quantities must be 0 or more, with at most 4 decimals ({sku}).', { sku }) };
    }
    const [good, damaged, missing] = values.map(Number);
    const outstanding = inTransit(item);
    // Exact for measured items (kg, m, l)
    const arriving = addQty(good, damaged);
    const extra = Math.max(0, subQty(arriving, outstanding));
    if (extra > 0 && missing > 0) {
      return {
        error: t('{sku}: no units can be missing when more arrived than was in transit.', { sku }),
      };
    }
    if (extra === 0 && addQty(arriving, missing) > outstanding) {
      return {
        error: t('{sku}: good + damaged + missing cannot exceed the {count} in transit.', {
          sku,
          count: outstanding,
        }),
      };
    }
    if (extra > 0) {
      over[item.id] = extra;
      if (extra > overReceiptAllowance(item, tolerancePercent)) needsApproval = true;
    }
    if (addQty(arriving, missing) > 0) {
      lines.push({
        itemId: item.id,
        quantity: good,
        ...(damaged > 0 && { damaged }),
        ...(missing > 0 && { missing }),
      });
    }
  }
  if (lines.length === 0) return { error: t('Enter at least one quantity.') };
  return { lines, over, needsApproval };
}

/**
 * Receipt table: per line what is in transit and the good / damaged / missing
 * units being recorded now
 */
export function ReceiveLinesTable({
  items,
  entries,
  onChange,
  tolerancePercent,
}: {
  items: TransferItem[];
  entries: Record<string, ReceiveEntry>;
  onChange: (entries: Record<string, ReceiveEntry>) => void;
  tolerancePercent: number;
}) {
  const set = (itemId: string, patch: Partial<ReceiveEntry>) =>
    onChange({ ...entries, [itemId]: { ...(entries[itemId] ?? { good: '', damaged: '', missing: '' }), ...patch } });
  const plan = planReceive(items, entries, tolerancePercent);
  const over = 'error' in plan ? {} : plan.over;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">{t('Product')}</th>
              <th className="px-3 py-2 text-right font-medium">{t('In transit')}</th>
              <th className="w-24 px-3 py-2 font-medium">{t('Good')}</th>
              <th className="w-24 px-3 py-2 font-medium">{t('Damaged')}</th>
              <th className="w-24 px-3 py-2 font-medium">{t('Missing')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => {
              const entry = entries[item.id] ?? { good: '', damaged: '', missing: '' };
              const sku = item.variant?.sku ?? '';
              return (
                <tr key={item.id} className={cn(over[item.id] && 'bg-amber-50')}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{transferItemLabel(item)}</div>
                    <div className="font-mono text-xs text-gray-500">{sku}</div>
                    {(item.quantityMissing ?? 0) > 0 && (
                      <div className="text-xs text-amber-700">
                        {t('{count} already reported missing', { count: item.quantityMissing ?? 0 })}
                      </div>
                    )}
                    {over[item.id] ? (
                      <div className="text-xs text-amber-700">
                        {t('{count} more than in transit (over-receipt)', { count: over[item.id] })}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right">{inTransit(item)}</td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      value={entry.good}
                      placeholder="0"
                      onChange={(e) => set(item.id, { good: e.target.value })}
                      aria-label={t('Good quantity for {sku}', { sku })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      value={entry.damaged}
                      placeholder="0"
                      onChange={(e) => set(item.id, { damaged: e.target.value })}
                      aria-label={t('Damaged quantity for {sku}', { sku })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      inputMode="numeric"
                      value={entry.missing}
                      placeholder="0"
                      onChange={(e) => set(item.id, { missing: e.target.value })}
                      aria-label={t('Missing quantity for {sku}', { sku })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {'error' in plan ? (
        <p className="text-sm text-red-600" role="alert">
          {plan.error}
        </p>
      ) : plan.needsApproval ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {t(
            'More units arrived than were in transit, above the over-receipt tolerance of {percent}%. A manager with "Approve stock transfers and over-receipts" must approve.',
            { percent: tolerancePercent }
          )}
        </p>
      ) : Object.keys(plan.over).length > 0 ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {t('More units arrived than were in transit, within the over-receipt tolerance of {percent}%.', {
            percent: tolerancePercent,
          })}
        </p>
      ) : null}
    </div>
  );
}
