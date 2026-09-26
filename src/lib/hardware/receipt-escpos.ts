import type { Sale } from '@/lib/api/sales';
import type { StoreSettings } from '@/lib/api/settings';
import { customerName } from '@/lib/api/customers';
import { text } from '@/lib/api/crud';
import { formatDateTime, formatMoney } from '@/lib/format';
import { receiptOptions, receiptSettings } from '@/components/pos/receipt';
import { t } from '@/i18n';
import { EscPosBuilder, type PaperWidth, type RasterImage } from './escpos';
import { lineQuantityText } from '@/lib/pos/quantity';

/**
 * The thermal receipt (same content as components/pos/receipt.tsx, 58/80 mm) as
 * ESC/POS bytes for the print bridge. Uses the sale's frozen seller snapshot, so a
 * reprint matches the original. Never contains a drawer kick: the drawer is opened
 * by its own command.
 */
export function receiptToEscPos(
  sale: Sale,
  settings: StoreSettings | undefined,
  options: { paper: PaperWidth; copyNumber?: number | null; logo?: RasterImage | null }
): Uint8Array {
  const s = receiptSettings(sale, settings);
  const o = receiptOptions(s);
  const money = (value: number) => formatMoney(Number(value), sale.currencyCode);
  const branch = sale.documentSnapshot?.branch ?? sale.branch;
  const p = new EscPosBuilder(options.paper);
  const copyBanner = () => {
    if (!options.copyNumber) return;
    p.align('center').bold();
    p.text(
      options.copyNumber > 1
        ? t('*** COPY #{copy} — NOT AN ORIGINAL ***', { copy: options.copyNumber })
        : t('*** COPY — NOT AN ORIGINAL ***')
    );
    p.bold(false).align('left');
  };

  // ---- Seller ----
  p.align('center');
  if (o.showLogo && options.logo) p.image(options.logo);
  p.bold().size('double').text(s?.storeName || branch?.name || '', Math.floor(p.width / 2)).size('normal').bold(false);
  if (o.showBusinessDetails) {
    if (s?.businessLegalName && s.businessLegalName !== s.storeName) p.text(s.businessLegalName);
    const address = [
      s?.businessAddressLine1 || branch?.addressLine1,
      s?.businessAddressLine2 || branch?.addressLine2,
      [s?.businessPostalCode || branch?.postalCode, s?.businessCity || branch?.city].filter(Boolean).join(' '),
      [s?.businessState, s?.businessCountry].filter(Boolean).join(', '),
    ].filter(Boolean) as string[];
    address.forEach((line) => p.text(line));
    const phone = s?.businessPhone || branch?.phone;
    if (phone) p.text(phone);
    const taxId = s?.businessTaxId || branch?.taxNumber;
    if (taxId) p.text(t('Tax no. {number}', { number: taxId }));
    if (s?.businessRegistrationNumber) p.text(t('Reg. no. {number}', { number: s.businessRegistrationNumber }));
  }
  if (s?.receiptHeader) p.text(s.receiptHeader);
  p.align('left');
  copyBanner();

  // ---- Sale ----
  p.separator();
  p.row(sale.saleNumber, formatDateTime(sale.saleDate));
  if (sale.offlineNumber) p.text(t('Offline no. {number}', { number: sale.offlineNumber }));
  if (sale.register) p.text(t('Register: {name}', { name: sale.register.name }));
  const cashier = sale.user ? [sale.user.firstName, sale.user.lastName].filter(Boolean).join(' ') || sale.user.email : null;
  if (o.showCashier && cashier) p.text(t('Cashier: {name}', { name: cashier }));
  if (o.showCustomer && sale.customer) p.text(t('Customer: {name}', { name: customerName(sale.customer) }));
  if (sale.status === 'voided') p.align('center').bold().text(t('*** VOIDED ***')).bold(false).align('left');
  if (sale.status === 'refunded') p.align('center').bold().text(t('*** REFUNDED ***')).bold(false).align('left');

  // ---- Lines ----
  p.separator();
  for (const item of sale.items ?? []) {
    const name = `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`;
    p.text(name);
    if (o.showSku && item.sku) p.text(`  ${item.sku}`);
    // "1.250 kg x 3.99/kg" for weighed (measured) lines
    p.row(`  ${lineQuantityText(item, money, 'x')}`, money(item.subtotal));
    if (Number(item.discountAmount) > 0) p.row(`  ${t('Discount')}`, `-${money(item.discountAmount)}`);
    if (item.notes) p.text(`  ${item.notes}`);
  }

  // ---- Totals ----
  p.separator();
  p.row(t('Subtotal'), money(sale.subtotal));
  if (Number(sale.discountAmount) > 0) p.row(t('Discounts'), `-${money(sale.discountAmount)}`);
  p.row(s?.pricesIncludeTax ? t('Tax (included)') : t('Tax'), money(sale.taxAmount));
  p.bold().size('tall').row(t('TOTAL'), money(sale.total)).size('normal').bold(false);
  p.separator();
  for (const payment of sale.payments ?? []) {
    const label = `${text(payment.paymentMethod?.name, t('Payment'))}${payment.reference ? ` #${payment.reference}` : ''}`;
    p.row(label, money(Number(payment.amount)));
  }
  if (Number(sale.changeAmount) > 0) p.row(t('Change|money'), money(sale.changeAmount));

  // ---- Footer ----
  p.align('center');
  if (o.showReturnPolicy && s?.returnPolicy) p.feed(1).text(s.returnPolicy);
  if (s?.receiptFooter) p.feed(1).text(s.receiptFooter);
  if (o.showBarcode && sale.saleNumber) p.feed(1).barcode(sale.saleNumber);
  p.align('left');
  copyBanner();
  return p.cut().bytes();
}

/** A short test page for the Hardware screen: accents, sizes, barcode, cut */
export function testPageEscPos(paper: PaperWidth, storeName: string): Uint8Array {
  const p = new EscPosBuilder(paper);
  p.align('center').bold().size('double').text(t('Test receipt'), Math.floor(p.width / 2)).size('normal').bold(false);
  p.text(storeName);
  p.text(formatDateTime(new Date().toISOString()));
  p.align('left').separator();
  p.text('Accents: é è ê à ç ô ù ï ñ ò É À Ç €');
  p.row(t('Paper width'), `${paper} mm / ${p.width} col.`);
  p.bold().text(t('Bold text')).bold(false);
  p.separator();
  p.align('center').barcode('TEST-12345').align('left');
  return p.cut().bytes();
}
