'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { formatMoney } from '@/lib/format';
import type { CartItem } from '@/stores/pos-store';
import { catalogPriceOf } from '@/stores/pos-store';
import { t } from '@/i18n';

/**
 * Price override for one cart line (pos.price.override, or a manager approval at checkout)
 */
export function PriceDialog({
  line,
  currency,
  canOverride,
  online,
  onApply,
  onClose,
}: {
  line: CartItem | null;
  currency: string;
  canOverride: boolean;
  online: boolean;
  onApply: (key: string, price: number | null) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!line} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {line && (
          <PriceForm
            key={line.key}
            line={line}
            currency={currency}
            canOverride={canOverride}
            online={online}
            onApply={onApply}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PriceForm({
  line,
  currency,
  canOverride,
  online,
  onApply,
  onClose,
}: {
  line: CartItem;
  currency: string;
  canOverride: boolean;
  online: boolean;
  onApply: (key: string, price: number | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(line.unitPrice.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const catalog = catalogPriceOf(line);
  // Offline there is no manager approval: only users allowed to override may do it
  const blocked = !canOverride && !online;

  const apply = () => {
    const price = Number(value);
    if (value.trim() === '' || Number.isNaN(price) || price < 0) {
      setError(t('Enter a price of 0 or more'));
      return;
    }
    onApply(line.key, price);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Change price')}</DialogTitle>
        <DialogDescription>
          {line.productName}
          {line.variantName ? ` (${line.variantName})` : ''} — {t('catalog price {price}.', { price: formatMoney(catalog, currency) })}
          {!canOverride && (online ? ` ${t('A manager will be asked to approve the new price at checkout.')}` : '')}
        </DialogDescription>
      </DialogHeader>
      {blocked ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {t("Changing a price needs a manager's approval, which needs a connection.")}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <ErrorMessage>{error}</ErrorMessage>
          <Field label={t('New unit price')} htmlFor="override-price">
            <Input
              id="override-price"
              autoFocus
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 text-right text-lg"
            />
          </Field>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                onApply(line.key, null);
                onClose();
              }}
            >
              {t('Use catalog price')}
            </Button>
            <Button type="submit" className="h-11">
              {t('Apply')}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
