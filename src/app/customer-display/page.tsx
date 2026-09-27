'use client';

import { useCustomerDisplay } from '@/lib/hardware/customer-display';
import { formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Customer-facing second screen (spec §15, optional). Open it on the till PC and
 * move the window to the customer display; it mirrors the POS tab's cart through a
 * BroadcastChannel (same browser, no server, nothing stored).
 */
export default function CustomerDisplayPage() {
  const message = useCustomerDisplay();

  if (!message || message.type === 'hello' || (message.type === 'cart' && message.lines.length === 0)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-8 text-center text-white max-sm:p-4">
        <div className="text-4xl font-bold break-words max-sm:text-3xl">{message && message.type !== 'hello' ? message.storeName : ''}</div>
        <div className="mt-4 text-2xl text-gray-300">{t('Welcome!')}</div>
      </main>
    );
  }

  const money = (value: number) => formatMoney(value, message.currency);

  if (message.type === 'complete') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900 p-8 text-center text-white max-sm:p-4">
        <div className="text-3xl max-sm:text-2xl">{t('Thank you!')}</div>
        <div className="text-5xl font-bold break-all max-sm:text-4xl">{money(message.total)}</div>
        {message.change > 0 && <div className="text-3xl text-green-300 max-sm:text-2xl">{t('Change: {amount}', { amount: money(message.change) })}</div>}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gray-900 p-8 text-white max-sm:h-dvh max-sm:min-h-0 max-sm:p-4">
      <div className="mb-4 truncate text-2xl font-bold max-sm:mb-3 max-sm:text-xl">{message.storeName}</div>
      <ul className="flex-1 space-y-2 overflow-hidden text-2xl max-sm:min-h-0 max-sm:text-lg">
        {message.lines.slice(-12).map((line) => (
          <li key={line.key} className="flex justify-between gap-4 border-b border-gray-700 pb-2">
            <span className="min-w-0 truncate">
              {line.quantity} × {line.name}
            </span>
            <span className="shrink-0">{money(line.total)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1 border-t border-gray-600 pt-4 text-2xl max-sm:text-lg">
        {message.discount > 0 && (
          <div className="flex justify-between text-green-300">
            <span>{t('Discounts')}</span>
            <span>-{money(message.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>{t('Tax')}</span>
          <span>{money(message.tax)}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 text-5xl font-bold max-sm:text-3xl">
          <span>{t('TOTAL')}</span>
          <span>{money(message.total)}</span>
        </div>
      </div>
    </main>
  );
}
