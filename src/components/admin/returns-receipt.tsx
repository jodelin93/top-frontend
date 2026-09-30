'use client';

import type { SaleReturn } from '@/lib/api/returns';
import type { StoreSettings } from '@/lib/api/settings';
import { customerName } from '@/lib/api/customers';
import { text } from '@/lib/api/crud';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { customerAddress, receiptSettings } from '@/components/pos/receipt';
import { t } from '@/i18n';

/**
 * Credit note for a return (spec §15): its own document title and number (the
 * return number), with a reference to the original invoice. Seller details are
 * the original sale's frozen snapshot when there is one. Thermal layout, or an A4 /
 * Letter page when the store prints invoices. Printed via .print-receipt.
 * `copy`: the number of this reprint; reprints say COPY.
 */
export function ReturnReceipt({
  saleReturn,
  settings,
  copy,
}: {
  saleReturn: SaleReturn;
  settings?: StoreSettings;
  copy?: number | null;
}) {
  const money = (value: number) => formatMoney(value, saleReturn.currencyCode);
  const original = saleReturn.originalSale;
  const seller = original ? receiptSettings(original, settings) : settings;
  const page = seller?.receiptFormat === 'a4' || seller?.receiptFormat === 'letter' ? seller.receiptFormat : null;
  const customer = original?.customer ?? null;
  const address = [
    seller?.businessAddressLine1,
    seller?.businessAddressLine2,
    [seller?.businessPostalCode, seller?.businessCity].filter(Boolean).join(' '),
    [seller?.businessState, seller?.businessCountry].filter(Boolean).join(', '),
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        'print-receipt mx-auto w-full bg-white text-black',
        page ? `receipt-${page} max-w-3xl p-2 text-sm` : 'max-w-xs font-mono text-xs'
      )}
      data-format={page ?? 'thermal'}
      data-document="credit_note"
    >
      <div className={page ? 'flex items-start justify-between gap-6 border-b-2 border-black pb-3' : 'text-center'}>
        <div>
          <div className={page ? 'text-xl font-bold' : 'text-sm font-bold'}>{seller?.storeName}</div>
          {seller?.businessLegalName && seller.businessLegalName !== seller.storeName && <div>{seller.businessLegalName}</div>}
          {page && address.map((line) => <div key={line}>{line}</div>)}
          {seller?.businessTaxId && <div>{t('Tax no. {number}', { number: seller.businessTaxId })}</div>}
        </div>
        <div className={page ? 'text-right' : 'mt-1'}>
          <div className={cn('font-bold uppercase tracking-wide', page ? 'text-2xl' : 'text-sm')} data-testid="credit-note-title">
            {t('Credit note')}
          </div>
          <div>{t('No. {number}', { number: saleReturn.returnNumber })}</div>
          <div>{formatDateTime(saleReturn.createdAt)}</div>
        </div>
      </div>
      {copy ? (
        <div className="my-1 border border-black py-0.5 text-center font-bold" data-testid="receipt-copy">
          {copy > 1 ? t('*** COPY #{copy} — NOT AN ORIGINAL ***', { copy }) : t('*** COPY — NOT AN ORIGINAL ***')}
        </div>
      ) : null}
      {!page && <div className="my-2 border-t border-dashed border-black" />}
      {original && (
        <div className={page ? 'mt-3' : undefined}>
          {t('Refers to invoice {number} of {date}', { number: original.saleNumber, date: formatDateTime(original.saleDate) })}
        </div>
      )}
      {saleReturn.returnType === 'goodwill' && <div>{t('Goodwill refund — no goods returned')}</div>}
      {saleReturn.returnType === 'exchange' && <div>{t('Exchange')}</div>}
      <div>{t('Reason: {reason}', { reason: saleReturn.reason })}</div>
      {customer && (
        <div className={page ? 'mt-3' : undefined}>
          {page && <div className="text-xs uppercase text-gray-500">{t('Credited to')}</div>}
          <div className={page ? 'font-medium' : undefined}>{page ? customerName(customer) : t('Customer: {name}', { name: customerName(customer) })}</div>
          {page && customerAddress(customer) && <div className="whitespace-pre-line text-gray-700">{customerAddress(customer)}</div>}
          {customer.taxNumber && <div>{t('Tax no. {number}', { number: customer.taxNumber })}</div>}
        </div>
      )}
      <div className="my-2 border-t border-dashed border-black" />
      {saleReturn.items?.map((item) => (
        <div key={item.id} className="mb-1">
          <div>
            {item.productName}
            {item.variantName && ` (${item.variantName})`}
          </div>
          <div className="flex justify-between pl-2">
            <span>
              {item.quantity} × {money(item.unitPrice)} · {item.disposition === 'restock'
                ? t('restocked')
                : item.disposition === 'damaged'
                  ? t('kept as damaged')
                  : t('disposed')}
            </span>
            <span>-{money(item.total)}</span>
          </div>
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-black" />
      <div className={page ? 'ml-auto w-72' : undefined}>
        <Row label={t('Subtotal')} value={`-${money(saleReturn.subtotal)}`} />
        {saleReturn.discountAmount > 0 && <Row label={t('Discounts reversed')} value={money(saleReturn.discountAmount)} />}
        <Row label={t('Tax')} value={`-${money(saleReturn.taxAmount)}`} />
        <Row label={t('CREDIT TOTAL')} value={money(saleReturn.total)} bold />
        <div className="my-2 border-t border-dashed border-black" />
        {saleReturn.refunds?.map((refund) => (
          <Row
            key={refund.id}
            label={`${text(refund.paymentMethod?.name, t('Refund'))}${refund.status !== 'completed' ? ` (${t(refund.status)})` : ''}`}
            value={
              refund.tenderedCurrency
                ? `${formatMoney(Number(refund.tenderedAmount), refund.tenderedCurrency)} (${money(refund.amount)})`
                : money(refund.amount)
            }
          />
        ))}
      </div>
      <div className="mt-3 text-center">{t('Customer signature: ________________')}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-sm font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
