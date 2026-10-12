import type { StoreSettings } from '@/lib/api/settings';

export type DocumentPaper = 'letter' | 'a4';

/**
 * Paper of every document that is not a till receipt (estimates, purchase orders,
 * statements...): US Letter unless the store chose A4 (Settings › Receipts & printing).
 * Receipts, credit notes and Z-reports follow the receipt format instead.
 */
export const documentPaper = (settings?: Pick<StoreSettings, 'documentPaper'> | null): DocumentPaper =>
  settings?.documentPaper === 'a4' ? 'a4' : 'letter';

/**
 * Classes that make an element the only thing printed, on a page of the store's
 * document paper (the print rules are in globals.css)
 */
export const documentPrintClass = (settings?: Pick<StoreSettings, 'documentPaper'> | null) =>
  `print-receipt receipt-${documentPaper(settings)}`;
