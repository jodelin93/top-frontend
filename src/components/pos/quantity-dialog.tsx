'use client';

import { useState } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { formatMoney } from '@/lib/format';
import { formatQuantity, parseQuantity, unitPrecision, type CatalogUnit } from '@/lib/pos/quantity';
import { calculateSale } from '@/lib/pos/sale-calculator';
import { t } from '@/i18n';

export interface QuantityTarget {
  productName: string;
  variantName: string | null;
  unit: CatalogUnit | null | undefined;
  unitPrice: number;
  // Editing a cart line: its current quantity
  quantity?: number;
}

/**
 * Quantity pad for measured items (sold by weight / length / volume): the cashier
 * types the weight read on the scale, e.g. 1.250 kg, with the unit's precision.
 */
export function QuantityDialog({
  target,
  currency,
  onApply,
  onClose,
}: {
  target: QuantityTarget | null;
  currency: string;
  onApply: (quantity: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {target && <QuantityForm target={target} currency={currency} onApply={onApply} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'] as const;

function QuantityForm({
  target,
  currency,
  onApply,
  onClose,
}: {
  target: QuantityTarget;
  currency: string;
  onApply: (quantity: number) => void;
  onClose: () => void;
}) {
  const precision = unitPrecision(target.unit);
  const [value, setValue] = useState(target.quantity ? String(target.quantity) : '');
  const [error, setError] = useState<string | null>(null);
  const quantity = parseQuantity(value, target.unit);
  // Same rounding as the cart: unit price × quantity to the cent
  const amount =
    quantity === null
      ? null
      : calculateSale(
          [{ key: 'q', productId: 'q', categoryId: null, quantity, unitPrice: target.unitPrice }],
          { taxRate: 0, pricesIncludeTax: false }
        ).subtotal;
  const unitCode = target.unit?.code ?? '';

  const press = (key: (typeof KEYS)[number]) => {
    setError(null);
    setValue((current) => {
      if (key === '.' && (precision === 0 || current.includes('.'))) return current;
      const next = key === '.' && current === '' ? '0.' : current + key;
      const decimals = next.split('.')[1]?.length ?? 0;
      return decimals > precision ? current : next;
    });
  };

  const apply = () => {
    if (quantity === null) {
      setError(
        precision > 0
          ? t('Enter a quantity above 0 with at most {count} decimals', { count: precision })
          : t('Enter a whole quantity above 0')
      );
      return;
    }
    onApply(quantity);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('Enter the quantity')}</DialogTitle>
        <DialogDescription>
          {target.productName}
          {target.variantName ? ` (${target.variantName})` : ''} —{' '}
          {unitCode
            ? t('{price} per {unit}', { price: formatMoney(target.unitPrice, currency), unit: unitCode })
            : t('{price} each', { price: formatMoney(target.unitPrice, currency) })}
        </DialogDescription>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <ErrorMessage>{error}</ErrorMessage>
        <Field label={unitCode ? t('Quantity ({unit})', { unit: unitCode }) : t('Quantity')} htmlFor="measured-quantity">
          <Input
            id="measured-quantity"
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value);
            }}
            placeholder={(0).toFixed(precision)}
            className="h-12 text-right text-lg"
          />
        </Field>
        <p className="text-right text-sm text-gray-600" aria-live="polite">
          {quantity !== null && amount !== null
            ? `${formatQuantity(quantity, target.unit)} = ${formatMoney(amount, currency)}`
            : ' '}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              className="h-12 text-lg"
              disabled={key === '.' && precision === 0}
              onClick={() => press(key)}
            >
              {key}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={() => setValue((current) => current.slice(0, -1))}
            aria-label={t('Delete last digit')}
          >
            <Delete className="h-5 w-5" aria-hidden />
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button type="submit" className="h-11">
            {t('Apply')}
          </Button>
        </div>
      </form>
    </>
  );
}
