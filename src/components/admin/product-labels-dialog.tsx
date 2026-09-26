'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Plus, Printer, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import { VariantPicker, variantLabel } from '@/components/admin/inventory-variant-picker';
import { Barcode } from '@/components/pos/barcode';
import { useCurrency } from '@/hooks/use-store-settings';
import { getErrorMessage } from '@/lib/api/client';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { formatMoney } from '@/lib/format';
import { Label, LabelLanguage, MAX_LABEL_COPIES, MAX_LABELS, productsApi } from '@/lib/api/products';
import { LANGUAGES, plural, t, useLang } from '@/i18n';

interface LabelLine {
  variantId: string;
  label: string;
  sku: string;
  copies: string;
}

const copiesOf = (line: LabelLine) => {
  const copies = Math.floor(Number(line.copies));
  return Number.isFinite(copies) ? copies : 0;
};

// Only the label sheet is printed, on A4 pages (the global print rules target receipts)
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 8mm; }
  .print-labels, .print-labels * { visibility: visible; }
  .print-labels { position: absolute; left: 0; top: 0; width: 100%; }
  [role="dialog"] { translate: none !important; }
}
`;

/**
 * Printable sheet of shelf labels: name, variant, price and a Code 128 barcode
 * of the code (barcode, else SKU). Labels never carry the cost.
 */
export function ProductLabelsSheet({ labels, currency }: { labels: Label[]; currency: string }) {
  return (
    <div className="print-labels grid grid-cols-2 gap-2 sm:grid-cols-3 print:grid-cols-3">
      {labels.map((label, index) => (
        <div
          key={`${label.variantId}-${index}`}
          className="flex break-inside-avoid flex-col gap-1 rounded border border-gray-300 bg-white p-2 text-black"
          data-testid="product-label"
        >
          <div className="truncate text-sm font-semibold">{label.name}</div>
          {label.variantName && <div className="truncate text-xs text-gray-600">{label.variantName}</div>}
          <div className="text-lg font-bold">{formatMoney(label.price, currency)}</div>
          <Barcode value={label.code} height={36} />
          <div className="text-center font-mono text-[10px]">{label.code}</div>
        </div>
      ))}
    </div>
  );
}

export function ProductLabelsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  // Each label sheet printed is recorded in the print history
  const printer = usePrintDocument();
  const currency = useCurrency();
  const appLang = useLang();
  const [lines, setLines] = useState<LabelLine[]>([]);
  const [language, setLanguage] = useState<LabelLanguage | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce((sum, line) => sum + Math.max(0, copiesOf(line)), 0);
  const invalid = lines.some((line) => copiesOf(line) < 1 || copiesOf(line) > MAX_LABEL_COPIES);

  const generate = useMutation({
    mutationFn: () =>
      productsApi.labels(
        lines.map((line) => ({ variantId: line.variantId, copies: copiesOf(line) })),
        language ?? appLang
      ),
    onSuccess: (result) => setLabels(result),
    onError: (err) => setError(getErrorMessage(err, 'Could not prepare labels')),
  });

  const update = (variantId: string, copies: string) =>
    setLines((current) => current.map((line) => (line.variantId === variantId ? { ...line, copies } : line)));

  const close = (next: boolean) => {
    if (!next) {
      setLines([]);
      setLabels(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = () => {
    if (invalid) {
      setError(t('Each line needs between 1 and {max} copies', { max: MAX_LABEL_COPIES }));
      return;
    }
    if (total > MAX_LABELS) {
      setError(t('At most {max} labels can be printed at once', { max: MAX_LABELS }));
      return;
    }
    setError(null);
    generate.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Print labels')}</DialogTitle>
          <DialogDescription>
            {t('Choose products and how many labels to print for each. Labels show the name, price and barcode.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        {labels ? (
          <>
            <style>{PRINT_CSS}</style>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">
                {plural(labels.length, '{count} label', '{count} labels')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLabels(null)}>
                  <ArrowLeft className="h-4 w-4" />
                  {t('Back')}
                </Button>
                <Button onClick={() => printer.print('label', crypto.randomUUID())} disabled={labels.length === 0}>
                  <Printer className="h-4 w-4" />
                  {t('Print')}
                </Button>
              </div>
            </div>
            {labels.length === 0 ? (
              <p className="text-sm text-gray-500">{t('No labels: the chosen variants were not found.')}</p>
            ) : (
              <ProductLabelsSheet labels={labels} currency={currency} />
            )}
          </>
        ) : (
          <>
            <VariantPicker
              autoFocus
              excludeIds={new Set(lines.map((line) => line.variantId))}
              renderAction={(product, variant) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      { variantId: variant.id, label: variantLabel(product, variant), sku: variant.sku, copies: '1' },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  {t('Add')}
                </Button>
              )}
            />

            {lines.length === 0 ? (
              <p className="text-sm text-gray-500">{t('No products added yet. Search above and click Add.')}</p>
            ) : (
              <div className="divide-y rounded-md border">
                {lines.map((line) => (
                  <div key={line.variantId} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{line.label}</div>
                      <div className="font-mono text-xs text-gray-500">{line.sku}</div>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={MAX_LABEL_COPIES}
                      className="w-24"
                      value={line.copies}
                      onChange={(e) => update(line.variantId, e.target.value)}
                      aria-label={t('Copies for {sku}', { sku: line.sku })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600"
                      onClick={() => setLines((current) => current.filter((other) => other.variantId !== line.variantId))}
                      aria-label={t('Remove {sku}', { sku: line.sku })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                {t('Label language')}
                <Select
                  className="w-36"
                  value={language ?? appLang}
                  onChange={(e) => setLanguage(e.target.value as LabelLanguage)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </Select>
              </label>
              <Button onClick={submit} disabled={lines.length === 0 || generate.isPending}>
                {generate.isPending
                  ? t('Preparing...')
                  : plural(total, 'Prepare {count} label', 'Prepare {count} labels')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
