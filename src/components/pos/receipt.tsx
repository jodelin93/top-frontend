'use client';

import type { Sale } from '@/lib/api/sales';
import type { StoreSettings } from '@/lib/api/settings';
import { customerName } from '@/lib/api/customers';
import { text } from '@/lib/api/crud';
import { loyaltyMath } from '@/lib/api/loyalty';
import { formatDateTime, formatMoney } from '@/lib/format';
import { amountDueIn } from '@/lib/pos/currency-math';
import { formatQuantity, lineQuantityText, lineUnit } from '@/lib/pos/quantity';
import { cn } from '@/lib/utils';
import { Barcode } from './barcode';
import { t } from '@/i18n';

export type ReceiptFormat = StoreSettings['receiptFormat'];

/**
 * Printable receipt, laid out for the store's receipt format (58mm or 80mm thermal
 * paper, or an A4 / US Letter invoice with the buyer's details) and model (classic, compact, modern), with the business
 * details and the options chosen in Settings → Receipts & printing.
 * Wrapped in .print-receipt so window.print() prints only this (see globals.css).
 *
 * `copy`: the number of this reprint (1, 2, ...). The first print is the original;
 * reprints say "COPY" so they can't be passed off as a second original.
 */
export function Receipt({
  sale,
  settings,
  format,
  copy,
  printable = true,
}: {
  sale: Sale;
  settings?: StoreSettings;
  format?: ReceiptFormat;
  copy?: number | null;
  // false: not printed by itself (e.g. one of several copies inside a print wrapper)
  printable?: boolean;
}) {
  // A reprint shows the seller as it was when the sale completed
  const effective = receiptSettings(sale, settings);
  const layout = format ?? effective?.receiptFormat ?? '80mm';
  const options = receiptOptions(effective);
  const printClass = printable ? 'print-receipt' : undefined;
  return layout === 'a4' || layout === 'letter' ? (
    <InvoiceReceipt sale={sale} settings={effective} options={options} copy={copy} paper={layout} printClass={printClass} />
  ) : (
    <ThermalReceipt sale={sale} settings={effective} options={options} copy={copy} width={layout} printClass={printClass} />
  );
}

/**
 * Settings as they were when the sale completed: the sale's snapshot (store and legal
 * name, address, tax and registration numbers, header/footer, return policy, template,
 * format) laid over the current settings, which still give the display options.
 * Sales from before snapshots existed use the settings as they are now.
 */
export function receiptSettings(sale: Sale, settings?: StoreSettings): StoreSettings | undefined {
  const snapshot = sale.documentSnapshot;
  if (!snapshot) return settings;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- not settings keys
  const { version, capturedAt, branch, ...seller } = snapshot;
  return { ...(settings ?? {}), ...seller } as StoreSettings;
}

/**
 * Buyer address for invoices, when the store keeps one on the customer
 * (metadata.address: text, or { line1, line2, postalCode, city, state, country })
 */
export function customerAddress(customer: Sale['customer']): string | null {
  const address = customer?.metadata?.address;
  if (typeof address === 'string') return address.trim() || null;
  if (address && typeof address === 'object') {
    const a = address as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const lines = [
      str(a.line1),
      str(a.line2),
      [str(a.postalCode), str(a.city)].filter(Boolean).join(' '),
      [str(a.state), str(a.country)].filter(Boolean).join(', '),
    ].filter(Boolean);
    return lines.length ? lines.join('\n') : null;
  }
  return null;
}

// The branch as it was when the sale completed (else as it is now)
const receiptBranch = (sale: Sale) => sale.documentSnapshot?.branch ?? sale.branch;

// ---------------------------------------------------------------------------
// Options (defaults apply when a setting has never been saved)

export interface ReceiptOptions {
  template: 'classic' | 'compact' | 'modern';
  showLogo: boolean;
  showBusinessDetails: boolean;
  showTaxBreakdown: boolean;
  showSku: boolean;
  showCashier: boolean;
  showCustomer: boolean;
  showLoyalty: boolean;
  showBarcode: boolean;
  showReturnPolicy: boolean;
  fontSize: 'small' | 'normal' | 'large';
}

export function receiptOptions(settings?: Partial<StoreSettings>): ReceiptOptions {
  return {
    template: settings?.receiptTemplate ?? 'classic',
    showLogo: settings?.receiptShowLogo ?? true,
    showBusinessDetails: settings?.receiptShowBusinessDetails ?? true,
    showTaxBreakdown: settings?.receiptShowTaxBreakdown ?? true,
    showSku: settings?.receiptShowSku ?? false,
    showCashier: settings?.receiptShowCashier ?? true,
    showCustomer: settings?.receiptShowCustomer ?? true,
    showLoyalty: settings?.receiptShowLoyalty ?? true,
    showBarcode: settings?.receiptShowBarcode ?? true,
    showReturnPolicy: settings?.receiptShowReturnPolicy ?? false,
    fontSize: settings?.receiptFontSize ?? 'normal',
  };
}

// Tax per rate, for receipts of carts that mix tax categories
function taxByRate(sale: Sale): { rate: number; base: number; tax: number }[] {
  const groups = new Map<number, { base: number; tax: number }>();
  for (const item of sale.items ?? []) {
    if (item.taxRate === null || item.taxRate === undefined) continue;
    const group = groups.get(Number(item.taxRate)) ?? { base: 0, tax: 0 };
    group.base += Number(item.subtotal) - Number(item.discountAmount);
    group.tax += Number(item.taxAmount);
    groups.set(Number(item.taxRate), group);
  }
  return [...groups.entries()].map(([rate, v]) => ({ rate, ...v })).sort((a, b) => a.rate - b.rate);
}

const cashierName = (sale: Sale) =>
  sale.user ? [sale.user.firstName, sale.user.lastName].filter(Boolean).join(' ') || sale.user.email : null;

const salespersonName = (sale: Sale) =>
  sale.salesperson
    ? [sale.salesperson.firstName, sale.salesperson.lastName].filter(Boolean).join(' ') || sale.salesperson.email
    : null;

/**
 * Business identity: logo, trading name, legal name, address, contacts, tax and
 * registration numbers. Falls back to the branch's address when none is set.
 */
function businessLines(settings: StoreSettings | undefined, sale: Sale) {
  const branch = receiptBranch(sale);
  const address = [
    settings?.businessAddressLine1 || branch?.addressLine1,
    settings?.businessAddressLine2 || branch?.addressLine2,
    [settings?.businessPostalCode || branch?.postalCode, settings?.businessCity || branch?.city]
      .filter(Boolean)
      .join(' '),
    [settings?.businessState, settings?.businessCountry].filter(Boolean).join(', '),
  ].filter(Boolean) as string[];
  return {
    name: settings?.storeName || branch?.name || '',
    legalName:
      settings?.businessLegalName && settings.businessLegalName !== settings.storeName
        ? settings.businessLegalName
        : null,
    address,
    phone: settings?.businessPhone || branch?.phone || null,
    email: settings?.businessEmail || branch?.email || null,
    website: settings?.businessWebsite || null,
    taxId: settings?.businessTaxId || branch?.taxNumber || null,
    registration: settings?.businessRegistrationNumber || null,
    logo: settings?.businessLogoUrl || null,
  };
}

// Points this sale earned and the customer's balance, when the store runs loyalty
function loyaltyInfo(sale: Sale, settings?: StoreSettings) {
  if (!settings?.loyaltyEnabled || !sale.customer) return null;
  const rules = {
    enabled: true,
    earnPercent: Number(settings.loyaltyEarnPercent),
    pointValue: Number(settings.loyaltyPointValue),
    minRedeemPoints: settings.loyaltyMinRedeemPoints,
    maxRedeemPercent: settings.loyaltyMaxRedeemPercent,
  };
  const paidWithPoints = (sale.payments ?? [])
    .filter((p) => p.paymentMethod?.code === 'LOYALTY')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  return {
    earned: sale.status === 'completed' ? loyaltyMath.earned(rules, Number(sale.total) - paidWithPoints) : 0,
    balance: Number(sale.customer.loyaltyPoints ?? 0),
    balanceValue: loyaltyMath.valueOf(rules, Number(sale.customer.loyaltyPoints ?? 0)),
  };
}

function CopyBanner({ copy }: { copy?: number | null }) {
  if (!copy) return null;
  return (
    <div className="my-1 border border-black py-0.5 text-center font-bold" data-testid="receipt-copy">
      {copy > 1 ? t('*** COPY #{copy} — NOT AN ORIGINAL ***', { copy }) : t('*** COPY — NOT AN ORIGINAL ***')}
    </div>
  );
}

function StatusBanner({ sale }: { sale: Sale }) {
  if (sale.status === 'voided') return <div className="mt-1 text-center font-bold">{t('*** VOIDED ***')}</div>;
  if (sale.status === 'refunded') return <div className="mt-1 text-center font-bold">{t('*** REFUNDED ***')}</div>;
  if (sale.status === 'payment_pending') return <div className="mt-1 text-center font-bold">{t('*** PAYMENT PENDING ***')}</div>;
  return null;
}

function Separator({ template }: { template: ReceiptOptions['template'] }) {
  return template === 'modern' ? (
    <div className="my-2 border-t-2 border-black" />
  ) : (
    <div className={cn('border-t border-dashed border-black', template === 'compact' ? 'my-1' : 'my-2')} />
  );
}

const THERMAL_FONT: Record<'58mm' | '80mm', Record<ReceiptOptions['fontSize'], string>> = {
  '58mm': { small: 'text-[9px]', normal: 'text-[10px]', large: 'text-xs' },
  '80mm': { small: 'text-[10px]', normal: 'text-xs', large: 'text-sm' },
};

// ---------------------------------------------------------------------------
// Thermal receipts (58 / 80 mm)

function ThermalReceipt({
  sale,
  settings,
  options,
  copy,
  width,
  printClass,
}: {
  sale: Sale;
  settings?: StoreSettings;
  options: ReceiptOptions;
  copy?: number | null;
  width: '58mm' | '80mm';
  printClass?: string;
}) {
  const money = (value: number) => formatMoney(value, sale.currencyCode);
  const business = businessLines(settings, sale);
  const rates = taxByRate(sale);
  const cashier = cashierName(sale);
  const salesperson = salespersonName(sale);
  const loyalty = options.showLoyalty ? loyaltyInfo(sale, settings) : null;
  const compact = options.template === 'compact';
  const modern = options.template === 'modern';
  return (
    <div
      className={cn(
        printClass,
        'mx-auto w-full bg-white font-mono text-black',
        width === '58mm' ? 'receipt-58mm max-w-[15rem]' : 'receipt-80mm max-w-xs',
        THERMAL_FONT[width][options.fontSize],
        modern && 'font-sans'
      )}
      data-format={width}
      data-template={options.template}
    >
      <div className="text-center">
        {options.showLogo && business.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- store logo from the storage service, printed
          <img src={business.logo} alt="" className={cn('mx-auto mb-1 object-contain', compact ? 'max-h-10' : 'max-h-16')} />
        )}
        <div className={cn('font-bold', modern ? 'text-base uppercase tracking-wide' : 'text-sm')}>{business.name}</div>
        {options.showBusinessDetails && (
          <div>
            {business.legalName && <div>{business.legalName}</div>}
            {compact ? (
              business.address.length > 0 && <div>{business.address.join(', ')}</div>
            ) : (
              business.address.map((line) => <div key={line}>{line}</div>)
            )}
            {(business.phone || business.email) && (
              <div>{[business.phone, compact ? null : business.email].filter(Boolean).join(' · ')}</div>
            )}
            {!compact && business.website && <div>{business.website}</div>}
            {business.taxId && <div>{t('Tax no. {number}', { number: business.taxId })}</div>}
            {!compact && business.registration && <div>{t('Reg. no. {number}', { number: business.registration })}</div>}
          </div>
        )}
        {settings?.receiptHeader && <div className="mt-1 whitespace-pre-line">{settings.receiptHeader}</div>}
      </div>
      <CopyBanner copy={copy} />

      <Separator template={options.template} />
      <div className="flex justify-between gap-2">
        <span>{sale.saleNumber}</span>
        <span>{formatDateTime(sale.saleDate)}</span>
      </div>
      {sale.offlineNumber && <div>{t('Offline no. {number}', { number: sale.offlineNumber })}</div>}
      {!compact && sale.register && <div>{t('Register: {name}', { name: sale.register.name })}</div>}
      {options.showCashier && cashier && <div>{t('Cashier: {name}', { name: cashier })}</div>}
      {salesperson && <div>{t('Salesperson: {name}', { name: salesperson })}</div>}
      {options.showCustomer && sale.customer && <div>{t('Customer: {name}', { name: customerName(sale.customer) })}</div>}
      <StatusBanner sale={sale} />

      <Separator template={options.template} />
      {sale.items?.map((item) =>
        compact ? (
          <div key={item.id} className="flex justify-between gap-2">
            <span className="min-w-0 truncate">
              {formatQuantity(Number(item.quantity), lineUnit(item.metadata))} {item.productName}
              {item.variantName && ` ${item.variantName}`}
            </span>
            <span>{money(Number(item.subtotal) - Number(item.discountAmount))}</span>
          </div>
        ) : (
          <div key={item.id} className="mb-1">
            <div className={cn(modern && 'font-semibold')}>
              {item.productName}
              {item.variantName && ` (${item.variantName})`}
            </div>
            {options.showSku && <div className="pl-2">{item.sku}</div>}
            <div className="flex justify-between pl-2">
              <span>{lineQuantityText(item, money)}</span>
              <span>{money(item.subtotal)}</span>
            </div>
            {item.originalUnitPrice != null && <div className="pl-2">{t('Price changed from {price}', { price: money(item.originalUnitPrice) })}</div>}
            {item.discountAmount > 0 && (
              <div className="flex justify-between pl-2">
                <span>
                  {t('Discount')}
                  {item.metadata?.discountReason && ` (${item.metadata.discountReason})`}
                </span>
                <span>-{money(item.discountAmount)}</span>
              </div>
            )}
            {item.notes && <div className="whitespace-pre-line pl-2 italic">{item.notes}</div>}
          </div>
        )
      )}

      <Separator template={options.template} />
      {!compact && <Row label={t('Subtotal')} value={money(sale.subtotal)} />}
      {sale.discountAmount > 0 && <Row label={t('Discounts')} value={`-${money(sale.discountAmount)}`} />}
      {sale.metadata?.cartDiscountReason && (
        <div className="pl-2">{t('Discount reason: {reason}', { reason: sale.metadata.cartDiscountReason })}</div>
      )}
      {options.showTaxBreakdown && rates.length > 1 ? (
        rates.map((r) => (
          <Row key={r.rate} label={t(settings?.pricesIncludeTax ? 'Incl. tax {rate}%' : 'Tax {rate}%', { rate: r.rate })} value={money(r.tax)} />
        ))
      ) : (
        <Row label={settings?.pricesIncludeTax ? t('Tax (included)') : t('Tax')} value={money(sale.taxAmount)} />
      )}
      {modern ? (
        <div className="my-1 border-2 border-black px-1 py-0.5">
          <Row label={t('TOTAL')} value={money(sale.total)} bold />
        </div>
      ) : (
        <Row label={t('TOTAL')} value={money(sale.total)} bold />
      )}

      <Separator template={options.template} />
      <PaymentRows sale={sale} money={money} />

      {loyalty && (
        <>
          <Separator template={options.template} />
          {loyalty.earned > 0 && <Row label={t('Points earned')} value={`+${loyalty.earned}`} />}
          <Row label={t('Points balance')} value={`${loyalty.balance} (${money(loyalty.balanceValue)})`} />
        </>
      )}

      {options.showReturnPolicy && settings?.returnPolicy && (
        <div className="mt-2 whitespace-pre-line text-center">{settings.returnPolicy}</div>
      )}
      {settings?.receiptFooter && <div className="mt-3 whitespace-pre-line text-center">{settings.receiptFooter}</div>}
      {options.showBarcode && sale.saleNumber && (
        <div className="mt-2">
          <Barcode value={sale.saleNumber} height={compact ? 28 : 36} />
        </div>
      )}
      <CopyBanner copy={copy} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// A4 invoice: business and customer blocks, a line table with tax rates, tax summary

function InvoiceReceipt({
  sale,
  settings,
  options,
  copy,
  paper = 'a4',
  printClass,
}: {
  sale: Sale;
  settings?: StoreSettings;
  options: ReceiptOptions;
  copy?: number | null;
  paper?: 'a4' | 'letter';
  printClass?: string;
}) {
  const money = (value: number) => formatMoney(value, sale.currencyCode);
  const business = businessLines(settings, sale);
  const rates = taxByRate(sale);
  const cashier = cashierName(sale);
  const salesperson = salespersonName(sale);
  const loyalty = options.showLoyalty ? loyaltyInfo(sale, settings) : null;
  const modern = options.template === 'modern';
  const buyerAddress = customerAddress(sale.customer);

  return (
    <div
      className={cn(
        printClass,
        paper === 'letter' ? 'receipt-letter' : 'receipt-a4',
        'mx-auto w-full max-w-3xl bg-white p-2 text-black',
        options.fontSize === 'small' ? 'text-xs' : options.fontSize === 'large' ? 'text-base' : 'text-sm'
      )}
      data-format={paper}
      data-template={options.template}
    >
      <div className={cn('flex items-start justify-between gap-6', modern && 'border-b-4 border-black pb-3')}>
        <div className="flex items-start gap-3">
          {options.showLogo && business.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- store logo from the storage service, printed
            <img src={business.logo} alt="" className="max-h-20 max-w-40 object-contain" />
          )}
          <div>
            <div className="text-xl font-bold">{business.name}</div>
            {options.showBusinessDetails && (
              <div className="text-gray-700">
                {business.legalName && <div>{business.legalName}</div>}
                {business.address.map((line) => (
                  <div key={line}>{line}</div>
                ))}
                {business.phone && <div>{business.phone}</div>}
                {business.email && <div>{business.email}</div>}
                {business.website && <div>{business.website}</div>}
                {business.taxId && <div>{t('Tax no. {number}', { number: business.taxId })}</div>}
                {business.registration && <div>{t('Reg. no. {number}', { number: business.registration })}</div>}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold uppercase tracking-wide">{t('Invoice')}</div>
          <div>{t('No. {number}', { number: sale.saleNumber })}</div>
          {sale.offlineNumber && <div>{t('Offline no. {number}', { number: sale.offlineNumber })}</div>}
          <div>{formatDateTime(sale.saleDate)}</div>
          {sale.register && <div>{t('Register: {name}', { name: sale.register.name })}</div>}
          {options.showCashier && cashier && <div>{t('Cashier: {name}', { name: cashier })}</div>}
          {salesperson && <div>{t('Salesperson: {name}', { name: salesperson })}</div>}
          {options.showBarcode && sale.saleNumber && (
            <div className="ml-auto mt-1 w-48">
              <Barcode value={sale.saleNumber} height={32} />
            </div>
          )}
        </div>
      </div>
      <CopyBanner copy={copy} />
      <StatusBanner sale={sale} />
      {settings?.receiptHeader && <div className="mt-3 whitespace-pre-line">{settings.receiptHeader}</div>}

      {options.showCustomer && sale.customer && (
        <div className="mt-4">
          <div className="text-xs uppercase text-gray-500">{t('Bill to')}</div>
          <div className="font-medium">{customerName(sale.customer)}</div>
          {buyerAddress && <div className="whitespace-pre-line text-gray-700">{buyerAddress}</div>}
          {sale.customer.email && <div className="text-gray-700">{sale.customer.email}</div>}
          {sale.customer.taxNumber && <div className="text-gray-700">{t('Tax no. {number}', { number: sale.customer.taxNumber })}</div>}
        </div>
      )}

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className={cn('border-b-2 border-black', modern && 'bg-gray-100')}>
            <th className="py-1 pr-2">{t('Item')}</th>
            <th className="py-1 pr-2 text-right">{t('Qty')}</th>
            <th className="py-1 pr-2 text-right">{t('Unit price')}</th>
            <th className="py-1 pr-2 text-right">{t('Discount')}</th>
            <th className="py-1 pr-2 text-right">{t('Tax')}</th>
            <th className="py-1 text-right">{t('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item) => (
            <tr key={item.id} className="border-b border-gray-300 align-top">
              <td className="py-1 pr-2">
                {item.productName}
                {item.variantName && ` (${item.variantName})`}
                {options.showSku && <div className="text-xs text-gray-500">{item.sku}</div>}
                {item.notes && <div className="text-xs italic text-gray-600">{item.notes}</div>}
                {item.metadata?.discountReason && (
                  <div className="text-xs text-gray-500">
                    {t('Discount reason: {reason}', { reason: item.metadata.discountReason })}
                  </div>
                )}
              </td>
              <td className="py-1 pr-2 text-right">{formatQuantity(Number(item.quantity), lineUnit(item.metadata))}</td>
              <td className="py-1 pr-2 text-right">
                {money(item.unitPrice)}
                {lineUnit(item.metadata)?.code && `/${lineUnit(item.metadata)?.code}`}
                {item.originalUnitPrice != null && (
                  <div className="text-xs text-gray-500">{t('was {price}', { price: money(item.originalUnitPrice) })}</div>
                )}
              </td>
              <td className="py-1 pr-2 text-right">{item.discountAmount > 0 ? `-${money(item.discountAmount)}` : '—'}</td>
              <td className="py-1 pr-2 text-right">{item.taxRate != null ? `${Number(item.taxRate)}%` : '—'}</td>
              <td className="py-1 text-right">{money(Number(item.subtotal) - Number(item.discountAmount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-72 space-y-0.5">
          <Row label={t('Subtotal')} value={money(sale.subtotal)} />
          {sale.discountAmount > 0 && <Row label={t('Discounts')} value={`-${money(sale.discountAmount)}`} />}
          {sale.metadata?.cartDiscountReason && (
            <div className="text-xs text-gray-500">
              {t('Discount reason: {reason}', { reason: sale.metadata.cartDiscountReason })}
            </div>
          )}
          {options.showTaxBreakdown && rates.length > 0 ? (
            rates.map((r) => (
              <Row
                key={r.rate}
                label={t(settings?.pricesIncludeTax ? 'Incl. tax {rate}% on {base}' : 'Tax {rate}% on {base}', {
                  rate: r.rate,
                  base: money(r.base),
                })}
                value={money(r.tax)}
              />
            ))
          ) : (
            <Row label={settings?.pricesIncludeTax ? t('Tax (included)') : t('Tax')} value={money(sale.taxAmount)} />
          )}
          <div className={cn('border-t-2 border-black pt-1', modern && 'bg-gray-100 px-1')}>
            <Row label={t('TOTAL')} value={money(sale.total)} bold />
          </div>
          <PaymentRows sale={sale} money={money} />
          {loyalty && (
            <>
              {loyalty.earned > 0 && <Row label={t('Points earned')} value={`+${loyalty.earned}`} />}
              <Row label={t('Points balance')} value={`${loyalty.balance} (${money(loyalty.balanceValue)})`} />
            </>
          )}
        </div>
      </div>

      {options.showReturnPolicy && settings?.returnPolicy && (
        <div className="mt-6 whitespace-pre-line text-xs text-gray-700">{settings.returnPolicy}</div>
      )}
      {settings?.receiptFooter && <div className="mt-6 whitespace-pre-line text-center">{settings.receiptFooter}</div>}
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

/**
 * Payments and change. Money handed over in another currency shows in that currency,
 * with the rate and its value in the sale currency.
 */
function PaymentRows({ sale, money }: { sale: Sale; money: (value: number) => string }) {
  const payments = sale.payments ?? [];
  const changeTender = sale.metadata?.changeTender;
  // Each foreign currency used on this sale, with the rate applied
  const rates = new Map<string, number>();
  for (const p of payments) {
    if (p.tenderedCurrency && p.exchangeRate) rates.set(p.tenderedCurrency, Number(p.exchangeRate));
  }
  if (changeTender) rates.set(changeTender.currencyCode, Number(changeTender.exchangeRate));

  return (
    <>
      {[...rates].map(([code, rate]) => (
        <Row key={code} label={t('Total in {currency}', { currency: code })} value={formatMoney(amountDueIn(Number(sale.total), rate), code)} />
      ))}
      {payments.map((payment) => {
        const label = `${text(payment.paymentMethod?.name, t('Payment'))}${payment.reference ? ` #${payment.reference}` : ''}`;
        return payment.tenderedCurrency ? (
          <div key={payment.id}>
            <Row label={label} value={formatMoney(Number(payment.tenderedAmount), payment.tenderedCurrency)} />
            <Row
              label={`  @ ${Number(payment.exchangeRate).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${payment.tenderedCurrency}/${sale.currencyCode}`}
              value={`= ${money(Number(payment.amount))}`}
            />
          </div>
        ) : (
          <Row key={payment.id} label={label} value={money(Number(payment.amount))} />
        );
      })}
      {sale.changeAmount > 0 &&
        (changeTender ? (
          <Row
            label={t('Change|money')}
            value={`${formatMoney(Number(changeTender.amount), changeTender.currencyCode)} (${money(Number(sale.changeAmount))})`}
          />
        ) : (
          <Row label={t('Change|money')} value={money(Number(sale.changeAmount))} />
        ))}
    </>
  );
}
