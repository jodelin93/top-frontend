'use client';

import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useStockLocationOptions,
  VariantPicker,
  variantLabel,
} from '@/components/admin/inventory-variant-picker';
import type { ReportParameter } from '@/lib/api/reports';
import { t } from '@/i18n';

export interface ParameterValues {
  variantId?: string;
  // Shown on the button once chosen
  variantLabel?: string;
  locationId?: string;
}

/**
 * Inputs a report needs besides dates and branch (e.g. the stock card's item
 * and optional location)
 */
export function ReportParameters({
  parameters,
  value,
  onChange,
}: {
  parameters: ReportParameter[];
  value: ParameterValues;
  onChange: (value: ParameterValues) => void;
}) {
  const [picking, setPicking] = useState(false);
  const { options } = useStockLocationOptions();
  if (parameters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm">
      {parameters.some((p) => p.key === 'variantId') && (
        <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
          <PackageSearch className="h-4 w-4" />
          {value.variantLabel ?? t('Choose an item')}
        </Button>
      )}
      {parameters.some((p) => p.key === 'locationId') && (
        <Select
          value={value.locationId ?? ''}
          onChange={(e) => onChange({ ...value, locationId: e.target.value || undefined })}
          className="h-8 w-56 text-xs"
          aria-label={t('Location')}
        >
          <option value="">{t('All locations')}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Choose an item')}</DialogTitle>
          </DialogHeader>
          <VariantPicker
            autoFocus
            renderAction={(product, variant) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange({
                    ...value,
                    variantId: variant.id,
                    variantLabel: `${variantLabel(product, variant)} (${variant.sku})`,
                  });
                  setPicking(false);
                }}
              >
                {t('Choose')}
              </Button>
            )}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
