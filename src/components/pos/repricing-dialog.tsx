'use client';

import { AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ChangeReason, LineChange, Revalidation } from '@/lib/pos/cart-revalidation';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

function reasonText(reason: ChangeReason, line: LineChange): string {
  switch (reason) {
    case 'price':
      return line.after && line.after.unitPrice > line.before.unitPrice ? t('Price went up') : t('Price went down');
    case 'tax':
      return t('Tax changed ({before}% → {after}%)', { before: line.before.taxRate, after: line.after?.taxRate ?? 0 });
    case 'promotion_lost':
      return t('Promotion no longer applies');
    case 'promotion_gained':
      return t('Promotion now applies');
    case 'stock':
      return t('Not enough stock ({count} available)', { count: line.available ?? 0 });
    case 'unsellable':
      return t('No longer sold');
  }
}

/**
 * Held cart resumed (or cart priced a while ago) whose prices, tax, promotions or stock
 * changed (spec §5, AC05). Blocking: the cashier shows the customer the difference and
 * either continues at the new prices (recorded on the sale) or goes back with the cart
 * as it is. Lines that cannot be sold are removed or reduced here first.
 */
export function RepricingDialog({
  result,
  currency,
  heldCart,
  busy,
  onConfirm,
  onCancel,
  onRemove,
  onReduce,
}: {
  // Null: closed
  result: Revalidation | null;
  currency: string;
  // Resumed held cart (else: a loaded estimate or a cart priced a while ago)
  heldCart: boolean;
  // Checking the cart again after a line was removed or reduced
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onRemove: (key: string) => void;
  onReduce: (key: string, quantity: number) => void;
}) {
  const money = (value: number) => formatMoney(value, currency);
  const difference = result?.difference ?? 0;

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {heldCart ? t('Prices changed since this cart was held') : t('Prices changed since this cart was priced')}
          </DialogTitle>
          <DialogDescription>
            {t('Show the customer what changed. The sale can only continue at the new prices.')}
          </DialogDescription>
        </DialogHeader>

        {result && (
          <>
            {result.lines.length > 0 && (
              <ul className="max-h-[45vh] divide-y overflow-y-auto rounded-md border" aria-label={t('Changed lines')}>
                {result.lines.map((line) => (
                  <li
                    key={line.key}
                    className={cn('flex flex-wrap items-center gap-3 p-3', line.blocking && 'bg-red-50')}
                    data-testid={`repriced-line-${line.key}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {line.productName}
                        {line.variantName ? ` (${line.variantName})` : ''}
                        <span className="ml-2 text-sm text-gray-500">× {line.quantity}</span>
                      </p>
                      <p className="text-sm text-gray-600">{line.reasons.map((r) => reasonText(r, line)).join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm tabular-nums">
                      <span className={cn(line.after && 'text-gray-500 line-through')}>{money(line.before.total)}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" aria-hidden />
                      <span className="font-semibold">{line.after ? money(line.after.total) : '—'}</span>
                    </div>
                    {line.blocking && (
                      <div className="flex w-full justify-end gap-2">
                        {line.available !== null && line.available > 0 && (
                          <Button variant="outline" disabled={busy} onClick={() => onReduce(line.key, line.available!)}>
                            {t('Keep {count}', { count: line.available })}
                          </Button>
                        )}
                        <Button variant="outline" disabled={busy} onClick={() => onRemove(line.key)}>
                          <Trash2 className="h-4 w-4" />
                          {t('Remove')}
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {result.discountCodeLost && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                {t('Discount code {code} no longer applies.', { code: result.discountCodeLost })}
              </p>
            )}

            <dl className="space-y-1 rounded-md bg-gray-50 p-3 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt>{t('Total before')}</dt>
                <dd data-testid="repricing-total-before">{money(result.totalBefore)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>{t('New total')}</dt>
                <dd data-testid="repricing-total-after">{money(result.totalAfter)}</dd>
              </div>
              <div className={cn('flex justify-between', difference > 0 ? 'text-red-700' : 'text-green-700')}>
                <dt>{t('Difference')}</dt>
                <dd data-testid="repricing-difference">
                  {difference > 0 ? '+' : ''}
                  {money(difference)}
                </dd>
              </div>
            </dl>

            {result.blocking && (
              <p className="text-sm text-red-700" role="alert">
                {t('Remove or reduce the lines that cannot be sold before continuing.')}
              </p>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('Keep cart and go back')}
          </Button>
          <Button onClick={onConfirm} disabled={busy || !result || result.blocking}>
            {t('Continue with the new prices')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
