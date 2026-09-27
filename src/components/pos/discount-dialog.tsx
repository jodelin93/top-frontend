'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { discountsApi, Discount } from '@/lib/api/discounts';
import type { CartDiscountInput } from '@/lib/api/sales';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { t } from '@/i18n';

/**
 * Apply a discount code and/or a manual discount on the whole cart
 */
export function DiscountDialog({
  open,
  onOpenChange,
  discount,
  cartDiscount,
  onApplyCode,
  onApplyCartDiscount,
  online,
  maxDiscountPercent = 100,
  discountBase = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: Discount | null;
  cartDiscount: CartDiscountInput | null;
  onApplyCode: (discount: Discount | null) => void;
  onApplyCartDiscount: (discount: CartDiscountInput | null) => void;
  online: boolean;
  // Store limit: a manual discount above it needs a manager and a written reason
  maxDiscountPercent?: number;
  // Amount a fixed discount is taken off (to compare it with the limit)
  discountBase?: number;
}) {
  const [code, setCode] = useState('');
  const [manualType, setManualType] = useState<'percentage' | 'fixed'>(cartDiscount?.type ?? 'percentage');
  const [manualValue, setManualValue] = useState(cartDiscount ? String(cartDiscount.value) : '');
  const [manualReason, setManualReason] = useState(cartDiscount?.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const applyCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    setError(null);
    try {
      onApplyCode(await discountsApi.lookup(code.trim()));
      setCode('');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid discount code'));
    } finally {
      setChecking(false);
    }
  };

  const applyManual = () => {
    const value = Number(manualValue);
    if (!manualValue.trim() || Number.isNaN(value) || value <= 0) {
      onApplyCartDiscount(null);
    } else if (manualType === 'percentage' && value > 100) {
      setError(t('A percentage discount cannot exceed 100%'));
      return;
    } else {
      const percent = manualType === 'percentage' ? value : discountBase > 0 ? (value / discountBase) * 100 : 0;
      if (percent > maxDiscountPercent && !manualReason.trim()) {
        setError(t('Discounts above {max}% need a reason.', { max: maxDiscountPercent }));
        return;
      }
      onApplyCartDiscount({ type: manualType, value, reason: manualReason.trim() || undefined });
    }
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Discounts')}</DialogTitle>
          <DialogDescription>
            {t('Apply a promotion code, or a manual discount on the whole sale. Per-item discounts are set on each cart line.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('Discount code')}</div>
          {discount ? (
            <div className="flex items-center justify-between rounded-md bg-green-50 p-3 text-sm text-green-800">
              <span>
                <span className="font-mono font-semibold">{discount.code}</span> — {text(discount.name)}
              </span>
              <Button variant="ghost" size="sm" onClick={() => onApplyCode(null)}>
                {t('Remove')}
              </Button>
            </div>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                applyCode();
              }}
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={online ? t('e.g. {example}', { example: 'SAVE10' }) : t('Codes need a connection')}
                disabled={!online}
                className="font-mono"
              />
              <Button type="submit" variant="outline" disabled={!online || checking || !code.trim()}>
                {checking ? t('Checking...') : t('Apply')}
              </Button>
            </form>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">{t('Manual discount on the sale')}</div>
          <div className="flex gap-2">
            <div className="flex shrink-0 overflow-hidden rounded-md border">
              {(['percentage', 'fixed'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setManualType(type)}
                  className={`px-3 text-sm ${manualType === type ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {type === 'percentage' ? '%' : t('Amount')}
                </button>
              ))}
            </div>
            <Input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              inputMode="decimal"
              enterKeyHint="done"
              className="min-w-0"
              placeholder={t('e.g. {example}', { example: manualType === 'percentage' ? '10' : '5.00' })}
            />
            <Button onClick={applyManual}>{t('Apply')}</Button>
          </div>
          <Input
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            maxLength={255}
            placeholder={t('Reason (required above {max}%)', { max: maxDiscountPercent })}
            aria-label={t('Reason for the discount')}
          />
          {cartDiscount && (
            <button
              className="text-xs text-red-600 hover:underline"
              onClick={() => {
                setManualValue('');
                setManualReason('');
                onApplyCartDiscount(null);
              }}
            >
              {t('Remove manual discount')}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
