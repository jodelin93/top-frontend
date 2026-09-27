'use client';

import { useState } from 'react';
import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorMessage, Field } from '@/components/admin/page-header';
import { storedValueApi, StoredValueAccount } from '@/lib/api/stored-value';
import { getErrorMessage } from '@/lib/api/client';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/** Same rule as the server: 12 to 32 letters / digits, with both (spaces and dashes ignored) */
export function isValidPreprintedCode(code: string): boolean {
  const raw = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{12,32}$/.test(raw) && /[A-Z]/.test(raw) && /[0-9]/.test(raw);
}

/**
 * Sell a gift card at the till (added to the sale as its own line: no tax, no
 * discount), or check a card's balance. Needs a connection: the card is created
 * and its code checked by the server.
 */
export function GiftCardDialog({
  open,
  onOpenChange,
  currency,
  online,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  online: boolean;
  onAdd: (card: { amount: number; code?: string }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [found, setFound] = useState<StoredValueAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const close = () => {
    setAmount('');
    setCode('');
    setLookupCode('');
    setFound(null);
    setError(null);
    onOpenChange(false);
  };

  const add = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      setError(t('Enter an amount of at least 1.00'));
      return;
    }
    if (code.trim() && !isValidPreprintedCode(code)) {
      setError(t('A gift card code has 12 to 32 characters, with letters and digits'));
      return;
    }
    onAdd({ amount: Math.round(value * 100) / 100, code: code.trim() || undefined });
    close();
  };

  const check = async () => {
    if (!lookupCode.trim()) return;
    setChecking(true);
    setError(null);
    try {
      setFound(await storedValueApi.lookupGiftCard(lookupCode.trim()));
    } catch (err) {
      setFound(null);
      setError(getErrorMessage(err, 'Gift card not found'));
    } finally {
      setChecking(false);
    }
  };

  const statusLabel = (status: StoredValueAccount['status']) =>
    status === 'active' ? t('Active') : status === 'pending' ? t('Not active yet') : t('Cancelled');

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            {t('Gift cards')}
          </DialogTitle>
          <DialogDescription>
            {online
              ? t('Sell a gift card with this sale, or check the balance of a card.')
              : t('Gift cards need a connection.')}
          </DialogDescription>
        </DialogHeader>

        <ErrorMessage>{error}</ErrorMessage>

        {online && (
          <>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <h3 className="text-sm font-semibold">{t('Sell a gift card')}</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('Amount')} htmlFor="gift-amount">
                  <Input
                    id="gift-amount"
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label={t('Card code (optional)')} htmlFor="gift-code" hint={t('Scan a pre-printed card, or leave empty to generate a code')}>
                  <Input
                    id="gift-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="off"
                    className="font-mono uppercase"
                  />
                </Field>
              </div>
              <Button type="submit" className="w-full" disabled={!amount}>
                {t('Add to the sale')}
              </Button>
            </form>

            <form
              className="space-y-2 border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                check();
              }}
            >
              <h3 className="text-sm font-semibold">{t('Check a balance')}</h3>
              <div className="flex gap-2">
                <Input
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder={t('Gift card code')}
                  aria-label={t('Gift card code')}
                  autoComplete="off"
                  className="flex-1 font-mono uppercase"
                />
                <Button type="submit" variant="outline" disabled={checking || !lookupCode.trim()}>
                  {checking ? t('Checking...') : t('Check balance')}
                </Button>
              </div>
              {found && (
                <p className="rounded-md bg-gray-50 p-3 text-sm">
                  {t('Card ending {last4}: {amount}', {
                    last4: found.last4 ?? '',
                    amount: formatMoney(found.balance, found.currencyCode || currency),
                  })}{' '}
                  · {statusLabel(found.status)}
                  {found.expiresAt && ` · ${t('expires {date}', { date: formatDate(found.expiresAt) })}`}
                </p>
              )}
            </form>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            {t('Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
