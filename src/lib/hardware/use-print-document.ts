'use client';

import { useState } from 'react';
import { flushSync } from 'react-dom';
import { getErrorMessage } from '@/lib/api/client';
import type { DocumentType } from './documents-api';
import { printDocument } from './print-manager';

/**
 * Print a non-receipt document (credit note, pro forma, Z-report, labels) through
 * the browser print dialog, recording the print job first. `copy` is the copy
 * number the server gave (show "COPY" on the document when set).
 */
export function usePrintDocument() {
  const [copy, setCopy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const print = async (documentType: DocumentType, documentId: string | null, options: { copy?: boolean } = {}) => {
    setError(null);
    try {
      await printDocument({
        documentType,
        documentId,
        copy: !!options.copy,
        browserPrint: (copyNumber) => {
          flushSync(() => setCopy(copyNumber));
          window.print();
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Could not print'));
    }
  };

  return { copy, error, print };
}
