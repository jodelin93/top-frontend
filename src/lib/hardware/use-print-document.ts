'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import { getErrorMessage } from '@/lib/api/client';
import type { DocumentType } from './documents-api';
import { printDocument, type PrintDeps, type PrintOutcome } from './print-manager';

/**
 * Print a non-receipt document (credit note, pro forma, Z-report, labels) through
 * the browser print dialog, recording the print job first. `copy` is the copy
 * number the server gave (show "COPY" on the document when set).
 *
 * `direct` sends printer commands without the dialog when its printer answers
 * (product labels on the label printer); the dialog stays the fallback.
 */
export interface DirectDocument {
  bytes: () => Uint8Array;
  deps: PrintDeps;
}

export function usePrintDocument() {
  const [copy, setCopy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const print = async (
    documentType: DocumentType,
    documentId: string | null,
    options: { copy?: boolean; direct?: DirectDocument } = {}
  ): Promise<PrintOutcome | null> => {
    setError(null);
    try {
      return await printDocument(
        {
          documentType,
          documentId,
          copy: !!options.copy,
          escpos: options.direct ? () => options.direct!.bytes() : null,
          browserPrint: (copyNumber) => {
            flushSync(() => setCopy(copyNumber));
            window.print();
          },
        },
        options.direct?.deps
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Could not print'));
      return null;
    }
  };

  return { copy, error, print };
}
