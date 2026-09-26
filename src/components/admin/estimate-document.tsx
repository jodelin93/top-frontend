'use client';

import type { Estimate } from '@/lib/api/estimates';
import { estimateCustomerName } from '@/lib/api/estimates';
import type { StoreSettings } from '@/lib/api/settings';
import { formatDate, formatMoney } from '@/lib/format';
import { t } from '@/i18n';

/**
 * Printable estimate / quotation (A4 or US Letter), with the business details from
 * Settings. Printed like receipts via .print-receipt.
 * `proForma`: printed as a PRO FORMA invoice (same content, not a tax invoice).
 * `copy`: the number of this reprint; reprints say COPY.
 */
export function EstimateDocument({
  estimate,
  settings,
  proForma = false,
  copy,
}: {
  estimate: Estimate;
  settings?: StoreSettings;
  proForma?: boolean;
  copy?: number | null;
}) {
  const money = (value: number) => formatMoney(value, estimate.currencyCode);
  const address = [
    settings?.businessAddressLine1,
    settings?.businessAddressLine2,
    [settings?.businessPostalCode, settings?.businessCity].filter(Boolean).join(' '),
    [settings?.businessState, settings?.businessCountry].filter(Boolean).join(', '),
  ].filter(Boolean);
  const hasSavings = estimate.items?.some((i) => Number(i.unitPrice) < Number(i.catalogPrice));

  const paper = settings?.receiptFormat === 'letter' ? 'letter' : 'a4';

  return (
    <div
      className={`print-receipt receipt-${paper} mx-auto w-full max-w-3xl bg-white p-2 text-sm text-black`}
      data-format={paper}
      data-document={proForma ? 'pro_forma' : 'estimate'}
    >
      <div className="flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div className="flex items-start gap-3">
          {settings?.businessLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- store logo from the storage service, printed
            <img src={settings.businessLogoUrl} alt="" className="max-h-20 max-w-40 object-contain" />
          )}
          <div>
            <div className="text-xl font-bold">{settings?.storeName}</div>
            <div className="text-gray-700">
              {settings?.businessLegalName && settings.businessLegalName !== settings.storeName && (
                <div>{settings.businessLegalName}</div>
              )}
              {address.map((line) => (
                <div key={line}>{line}</div>
              ))}
              {settings?.businessPhone && <div>{settings.businessPhone}</div>}
              {settings?.businessEmail && <div>{settings.businessEmail}</div>}
              {settings?.businessWebsite && <div>{settings.businessWebsite}</div>}
              {settings?.businessTaxId && <div>{t('Tax no. {value}', { value: settings.businessTaxId })}</div>}
              {settings?.businessRegistrationNumber && <div>{t('Reg. no. {value}', { value: settings.businessRegistrationNumber })}</div>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold uppercase tracking-wide">{proForma ? t('Pro forma invoice') : t('Estimate')}</div>
          <div>{t('No. {number}', { number: estimate.estimateNumber })}</div>
          <div>{t('Date: {date}', { date: formatDate(`${estimate.issueDate}T00:00:00`) })}</div>
          <div className="font-medium">
            {t('Valid until: {date}', { date: formatDate(`${estimate.validUntil}T00:00:00`) })}
          </div>
        </div>
      </div>

      {copy ? (
        <div className="my-2 border border-black py-0.5 text-center font-bold" data-testid="receipt-copy">
          {copy > 1 ? t('*** COPY #{copy} — NOT AN ORIGINAL ***', { copy }) : t('*** COPY — NOT AN ORIGINAL ***')}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="text-xs uppercase text-gray-500">{t('Prepared for')}</div>
        <div className="font-medium">{estimateCustomerName(estimate)}</div>
        {estimate.customer?.email && <div className="text-gray-700">{estimate.customer.email}</div>}
        {estimate.customer?.phone && <div className="text-gray-700">{estimate.customer.phone}</div>}
        {proForma && estimate.customer?.taxNumber && (
          <div className="text-gray-700">{t('Tax no. {number}', { number: estimate.customer.taxNumber })}</div>
        )}
      </div>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-1 pr-2">{t('Item')}</th>
            <th className="py-1 pr-2 text-right">{t('Qty')}</th>
            <th className="py-1 pr-2 text-right">{t('Unit price')}</th>
            <th className="py-1 pr-2 text-right">{t('Discount')}</th>
            <th className="py-1 pr-2 text-right">{t('Tax')}</th>
            <th className="py-1 text-right">{t('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {estimate.items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-300 align-top">
              <td className="py-1 pr-2">
                {item.productName}
                {item.variantName && ` (${item.variantName})`}
                <div className="text-xs text-gray-500">{item.sku}</div>
                {item.note && <div className="text-xs text-gray-600">{item.note}</div>}
              </td>
              <td className="py-1 pr-2 text-right">{item.quantity}</td>
              <td className="py-1 pr-2 text-right">
                {money(item.unitPrice)}
                {Number(item.unitPrice) < Number(item.catalogPrice) && (
                  <div className="text-xs text-gray-500 line-through">{money(item.catalogPrice)}</div>
                )}
              </td>
              <td className="py-1 pr-2 text-right">{Number(item.discountPercent) > 0 ? `${Number(item.discountPercent)}%` : '—'}</td>
              <td className="py-1 pr-2 text-right">{item.taxRate != null ? `${Number(item.taxRate)}%` : '—'}</td>
              <td className="py-1 text-right">{money(Number(item.subtotal) - Number(item.discountAmount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-0.5">
          <Row label={t('Subtotal')} value={money(estimate.subtotal)} />
          {estimate.discountAmount > 0 && <Row label={t('Discounts')} value={`-${money(estimate.discountAmount)}`} />}
          <Row label={settings?.pricesIncludeTax ? t('Tax (included)') : t('Tax')} value={money(estimate.taxAmount)} />
          <div className="border-t-2 border-black pt-1">
            <Row label={t('TOTAL')} value={money(estimate.total)} bold />
          </div>
          {hasSavings && <div className="text-right text-xs text-gray-600">{t('Includes special pricing')}</div>}
        </div>
      </div>

      {estimate.notes && (
        <div className="mt-4">
          <div className="text-xs uppercase text-gray-500">{t('Notes')}</div>
          <div className="whitespace-pre-line">{estimate.notes}</div>
        </div>
      )}
      {estimate.terms && (
        <div className="mt-3">
          <div className="text-xs uppercase text-gray-500">{t('Terms & conditions')}</div>
          <div className="whitespace-pre-line text-xs">{estimate.terms}</div>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-600">
        {proForma
          ? t('Pro forma invoice: not a tax invoice. Prices are valid until {date} and subject to stock availability.', {
              date: formatDate(`${estimate.validUntil}T00:00:00`),
            })
          : t('This estimate is not an invoice. Prices are valid until {date} and subject to stock availability.', {
              date: formatDate(`${estimate.validUntil}T00:00:00`),
            })}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
        <div className="border-t border-black pt-1">{t('Accepted by (name, signature)')}</div>
        <div className="border-t border-black pt-1">{t('Date')}</div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? 'text-sm font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
