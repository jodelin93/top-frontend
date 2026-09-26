'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Printer, RotateCcw, ShoppingCart, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import type { Sale } from '@/lib/api/sales';
import type { StoreSettings } from '@/lib/api/settings';
import { getErrorMessage } from '@/lib/api/client';
import { getPairing } from '@/lib/hardware/bridge-client';
import { printDocument, retryPrint, type PrintOutcome, type PrintRequest } from '@/lib/hardware/print-manager';
import { receiptToEscPos } from '@/lib/hardware/receipt-escpos';
import { hasPermission, useAuthStore } from '@/stores/auth-store';
import { Receipt, receiptSettings } from './receipt';
import { ReceiptShare } from './receipt-share';
import { ChangeBanner } from './change-banner';
import { t } from '@/i18n';

/**
 * Print a receipt (spec §15). Every print is recorded as a print job first; the
 * server answers whether it is the original or COPY #n (copies need
 * sales.reprint). Thermal receipts go to the paired print bridge (ESC/POS) when
 * it answers, anything else to the browser print dialog. An uncertain print can
 * be retried: it comes back as a COPY. Printing never opens the cash drawer.
 */
export function useReceiptPrinter() {
  const [copy, setCopy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PrintOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef<PrintRequest | null>(null);

  const request = (sale: Sale, options: { original: boolean; offline?: boolean; settings?: StoreSettings }): PrintRequest => {
    const format = receiptSettings(sale, options.settings)?.receiptFormat ?? '80mm';
    const thermal = format === '58mm' || format === '80mm';
    return {
      // A4 / Letter prints are invoices
      documentType: thermal ? 'receipt' : 'invoice',
      documentId: options.offline ? null : sale.id,
      copy: !options.original,
      offline: options.offline,
      localCopyNumber: (copy ?? 0) + 1,
      escpos: thermal
        ? (copyNumber) =>
            receiptToEscPos(sale, options.settings, {
              paper: getPairing()?.widthMm ?? (format === '58mm' ? 58 : 80),
              copyNumber,
            })
        : null,
      browserPrint: (copyNumber) => {
        flushSync(() => setCopy(copyNumber));
        window.print();
      },
    };
  };

  const run = async (work: () => Promise<PrintOutcome>) => {
    setError(null);
    setBusy(true);
    try {
      const result = await work();
      setOutcome(result);
      flushSync(() => setCopy(result.copyNumber));
      if (result.status === 'unknown') setError(t('The printer did not confirm this receipt. Check the paper before printing again.'));
      return result;
    } catch (err) {
      setError(getErrorMessage(err, 'Could not print the receipt'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const print = (sale: Sale, options: { original: boolean; offline?: boolean; settings?: StoreSettings }) => {
    const req = request(sale, options);
    last.current = req;
    return run(() => printDocument(req));
  };

  // Only failed or uncertain jobs; the server makes an uncertain one a COPY
  const canRetry = !!outcome?.job && (outcome.status === 'failed' || outcome.status === 'unknown');
  const retry = () => {
    if (!outcome?.job || !last.current) return Promise.resolve(null);
    const previous = outcome.job;
    return run(() => retryPrint(previous, last.current!));
  };

  return {
    copy,
    error,
    outcome,
    busy,
    print,
    canRetry,
    retry,
    reset: () => {
      setCopy(null);
      setOutcome(null);
      setError(null);
    },
  };
}

/**
 * Shown after a sale completes: receipt preview, print, e-mail / share, next sale
 */
export function ReceiptDialog({
  sale,
  settings,
  offline,
  onClose,
}: {
  sale: Sale | null;
  settings?: StoreSettings;
  offline: boolean;
  onClose: () => void;
}) {
  const printer = useReceiptPrinter();
  const { user } = useAuthStore();
  const [printed, setPrinted] = useState(false);
  const copies = Math.min(Math.max(settings?.receiptCopies ?? 1, 1), 3);
  const wide = settings?.receiptFormat === 'a4' || settings?.receiptFormat === 'letter';

  // Auto-print the original as soon as the sale is shown (Settings → Receipts & printing)
  const autoPrintedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!sale || !settings?.autoPrintReceipt || autoPrintedFor.current === sale.id) return;
    autoPrintedFor.current = sale.id;
    // Let the receipt render before opening the print dialog. No cleanup: the
    // printer helper changes every render, and the ref already prevents a repeat.
    setTimeout(() => {
      printer.print(sale, { original: true, offline, settings }).then(() => setPrinted(true));
    }, 300);
  }, [sale, settings, offline, printer]);

  const close = () => {
    setPrinted(false);
    printer.reset();
    onClose();
  };

  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && close()}>
      <DialogContent className={wide ? 'max-w-3xl' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>{t('Sale complete')}</DialogTitle>
        </DialogHeader>
        {offline && (
          <p className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <WifiOff className="h-4 w-4 shrink-0" />
            {t('Saved offline. It will be uploaded and get its final receipt number when the connection returns.')}
          </p>
        )}
        {sale && <ChangeBanner sale={sale} />}
        <ErrorMessage>{printer.error}</ErrorMessage>
        {printer.canRetry && (
          <Button variant="outline" size="sm" onClick={() => printer.retry()} disabled={printer.busy}>
            <RotateCcw className="h-4 w-4" />
            {printer.outcome?.status === 'unknown' ? t('Print again as a copy') : t('Try printing again')}
          </Button>
        )}
        <div className="max-h-[45vh] overflow-y-auto rounded-md border p-4">
          {sale && <Receipt sale={sale} settings={settings} copy={printer.copy} printable={copies === 1} />}
        </div>
        {/* Several copies per sale: printed one after another, each on its own page/cut */}
        {sale && copies > 1 && (
          <div className="print-receipt print-copies hidden">
            {Array.from({ length: copies }, (_, i) => (
              <div key={i} className="print-copy">
                <Receipt sale={sale} settings={settings} copy={printer.copy} printable={false} />
              </div>
            ))}
          </div>
        )}
        {sale && !offline && hasPermission(user, 'sales.reprint') && <ReceiptShare sale={sale} />}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12"
            disabled={printer.busy || (printed && !offline && !hasPermission(user, 'sales.reprint'))}
            onClick={async () => {
              if (!sale) return;
              await printer.print(sale, { original: !printed, offline, settings });
              setPrinted(true);
            }}
          >
            <Printer className="h-4 w-4" />
            {printed ? t('Print copy') : t('Print receipt')}
          </Button>
          <Button className="h-12" onClick={close} autoFocus>
            <ShoppingCart className="h-4 w-4" />
            {t('New sale')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
