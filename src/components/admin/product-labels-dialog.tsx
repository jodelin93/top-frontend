'use client';

import { useEffect, useState } from 'react';
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
import { isLabelPrintAvailable } from '@/lib/hardware/direct-print';
import { labelsToTspl } from '@/lib/hardware/label-tspl';
import { labelPrintDeps } from '@/lib/hardware/print-manager';
import { usePrintDocument } from '@/lib/hardware/use-print-document';
import { formatLabelPrice } from '@/lib/format';
import { Label, LabelLanguage, MAX_LABEL_COPIES, MAX_LABELS, productsApi } from '@/lib/api/products';
import { LANGUAGES, plural, t, useLang } from '@/i18n';
import { randomId } from '@/lib/uuid';

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

// Only the labels are printed, one label per 1 x 1 inch page (the global print rules
// target receipts). Used when the label printer is not reached through JodaPrint.
const PRINT_CSS = `
@media print {
  @page { size: 1in 1in; margin: 0; }
  .print-labels, .print-labels * { visibility: visible; }
  .print-labels { position: absolute; left: 0; top: 0; display: block; }
  .print-labels > div { border: 0; border-radius: 0; break-after: page; break-inside: avoid; }
  [role="dialog"] { --tw-translate-x: 0 !important; --tw-translate-y: 0 !important; transform: none !important; left: 0 !important; top: 0 !important; }
}
`;

/**
 * Product labels, 1 x 1 inch each: name, variant, price and a Code 128 barcode of the
 * code (barcode, else SKU). Labels never carry the cost.
 */
export function ProductLabelsSheet({ labels, currency }: { labels: Label[]; currency: string }) {
  return (
    <div className="print-labels flex flex-wrap gap-2">
      {labels.map((label, index) => (
        <div
          key={`${label.variantId}-${index}`}
          className="flex h-[1in] w-[1in] flex-col items-center justify-center overflow-hidden rounded border border-gray-300 bg-white p-1 text-center text-black"
          data-testid="product-label"
        >
          <div className={`w-full text-[8px] font-semibold leading-tight ${label.variantName ? 'truncate' : 'line-clamp-2'}`}>
            {label.name}
          </div>
          {label.variantName && <div className="w-full truncate text-[8px] leading-tight">{label.variantName}</div>}
          <div className="text-[12px] font-bold leading-tight">{formatLabelPrice(label.price, currency)}</div>
          <Barcode value={label.code} height={26} />
          <div className="w-full truncate font-mono text-[7px] leading-tight">{label.code}</div>
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
  // Is the label printer of this till reached through JodaPrint? (null: checking)
  const [direct, setDirect] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!labels) return;
    let current = true;
    isLabelPrintAvailable().then((available) => {
      if (current) setDirect(available);
    });
    return () => {
      current = false;
    };
  }, [labels]);

  const print = async () => {
    if (!labels) return;
    setPrinting(true);
    setNotice(null);
    const outcome = await printer.print('label', randomId(), {
      direct: { bytes: () => labelsToTspl(labels, (price) => formatLabelPrice(price, currency)), deps: labelPrintDeps },
    });
    if (outcome?.channel === 'bridge') {
      if (outcome.status === 'printed') setNotice(plural(labels.length, '{count} label sent to the label printer.', '{count} labels sent to the label printer.'));
      else setError(t('The label printer did not confirm the labels: check the printer before printing again.'));
    } else if (outcome?.error) {
      // Sent to the browser dialog after the label printer refused
      setError(t('The label printer did not print: {error}', { error: outcome.error }));
    }
    setPrinting(false);
  };

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
      setNotice(null);
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
            {t('Choose products and how many labels to print for each. Labels are 1 × 1 inch and show the name, price and barcode.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error ?? printer.error}</ErrorMessage>
        {notice && <p className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}

        {labels ? (
          <>
            <style>{PRINT_CSS}</style>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">
                {plural(labels.length, '{count} label', '{count} labels')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLabels(null);
                    setNotice(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('Back')}
                </Button>
                <Button onClick={print} disabled={labels.length === 0 || printing}>
                  <Printer className="h-4 w-4" />
                  {printing ? t('Printing...') : t('Print')}
                </Button>
              </div>
            </div>
            {direct !== null && (
              <p className="text-sm text-gray-600" data-testid="label-printer-hint">
                {direct
                  ? t('Labels are 1 × 1 inch and go straight to the label printer (JodaPrint).')
                  : t('Labels are 1 × 1 inch. The label printer was not found through JodaPrint: the browser print window opens, choose the label printer and a 1 × 1 inch paper there.')}
              </p>
            )}
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
