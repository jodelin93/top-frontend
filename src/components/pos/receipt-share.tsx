'use client';

import { useState } from 'react';
import { Copy, Link2, Mail, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorMessage } from '@/components/admin/page-header';
import type { Sale } from '@/lib/api/sales';
import { getErrorCode, getErrorMessage } from '@/lib/api/client';
import { documentsApi, publicReceiptUrl } from '@/lib/hardware/documents-api';
import { t } from '@/i18n';

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** The sale customer's own address (prefilled) */
export function consentedEmail(sale: Pick<Sale, 'customer'>): string | null {
  return sale.customer?.email || null;
}

/**
 * Needs the cashier's confirmation that the customer asked for the receipt by
 * e-mail: always. Marketing consent is not consent to receipts, and there is no
 * separate receipt consent, so the server asks for it on every send.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function needsConsentConfirmation(_sale: Pick<Sale, 'customer'>, _to: string): boolean {
  return true;
}

/**
 * E-mail the receipt, or create a signed read-only link to send by SMS / WhatsApp
 * from the cashier's phone ("Copy link" / "Share"). Each send is recorded.
 */
export function ReceiptShare({ sale }: { sale: Sale }) {
  const [mode, setMode] = useState<'email' | 'link' | null>(null);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        <Button type="button" variant={mode === 'email' ? 'default' : 'outline'} onClick={() => setMode(mode === 'email' ? null : 'email')}>
          <Mail className="h-4 w-4" />
          {t('Email receipt')}
        </Button>
        <Button type="button" variant={mode === 'link' ? 'default' : 'outline'} onClick={() => setMode(mode === 'link' ? null : 'link')}>
          <Link2 className="h-4 w-4" />
          {t('Receipt link (SMS, WhatsApp)')}
        </Button>
      </div>
      {mode === 'email' && <EmailReceiptForm sale={sale} />}
      {mode === 'link' && <ShareLinkPanel sale={sale} />}
    </div>
  );
}

function EmailReceiptForm({ sale }: { sale: Sale }) {
  const [to, setTo] = useState(consentedEmail(sale) ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const needsConfirmation = needsConsentConfirmation(sale, to);
  const valid = EMAIL.test(to.trim()) && (!needsConfirmation || confirmed);

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      const delivery = await documentsApi.emailReceipt(sale.id, { to: to.trim(), consentConfirmed: needsConfirmation ? confirmed : undefined });
      setSentTo(delivery.recipient ?? to.trim());
    } catch (err) {
      setError(
        getErrorCode(err) === 'EMAIL_DISABLED'
          ? t('E-mail is not set up for this store.')
          : getErrorMessage(err, 'Could not e-mail the receipt')
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      className="space-y-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) send();
      }}
    >
      <Input
        type="email"
        value={to}
        onChange={(e) => {
          setTo(e.target.value);
          setSentTo(null);
        }}
        placeholder={t('customer@example.com')}
        aria-label={t('Customer e-mail')}
        autoComplete="off"
      />
      {needsConfirmation && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>{t('The customer asked to receive this receipt by e-mail (no marketing)')}</span>
        </label>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {sentTo && <p className="text-sm text-green-700">{t('Receipt sent to {to}', { to: sentTo })}</p>}
      <Button type="submit" size="sm" disabled={!valid || sending}>
        {sending ? t('Sending...') : t('Send')}
      </Button>
    </form>
  );
}

function ShareLinkPanel({ sale }: { sale: Sale }) {
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const create = async () => {
    setError(null);
    setBusy(true);
    try {
      const link = await documentsApi.shareLink(sale.id, { expiresInDays: 30 });
      setUrl(publicReceiptUrl(link.path));
      setExpiresAt(link.expiresAt);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create the link'));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(t('Could not copy. Select the link and copy it.'));
    }
  };

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: t('Receipt {number}', { number: sale.saleNumber }), url });
    } catch {
      // Closed by the user
    }
  };

  return (
    <div className="space-y-2 rounded-md border p-3">
      {!url ? (
        <>
          <p className="text-xs text-gray-500">
            {t('Creates a read-only link to this receipt, valid 30 days, to send from your phone by SMS or WhatsApp.')}
          </p>
          <Button type="button" size="sm" onClick={create} disabled={busy}>
            {busy ? t('Creating...') : t('Create link')}
          </Button>
        </>
      ) : (
        <>
          <Input readOnly value={url} onFocus={(e) => e.target.select()} aria-label={t('Receipt link')} />
          {expiresAt && <p className="text-xs text-gray-500">{t('Valid until {date}', { date: new Date(expiresAt).toLocaleDateString() })}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? t('Copied') : t('Copy link')}
            </Button>
            {canShare && (
              <Button type="button" size="sm" variant="outline" onClick={share}>
                <Share2 className="h-4 w-4" />
                {t('Share')}
              </Button>
            )}
          </div>
        </>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
