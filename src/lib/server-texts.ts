/**
 * Texts written by the server in English, shown in the user's language.
 *
 * - Fixed texts (most error messages) are looked up as they are in the dictionaries.
 * - Texts with a variable part ("Not enough stock (20 on hand)", notification titles,
 *   account entry notes) are matched against the server's templates below and rebuilt
 *   with t(), so the variable part is kept.
 * - Permission labels, groups and built-in role names come from the server's catalog:
 *   they are translated here by permission key, with the server's English label as
 *   fallback for a permission this screen does not know yet.
 *
 * A text that matches nothing is shown as the server wrote it.
 */
import { plural, t } from '@/i18n';
import { formatDate } from '@/lib/format';

type Rule = [RegExp, (m: RegExpMatchArray) => string];

// Translation of a text when the dictionaries have it ("" otherwise)
function exact(text: string): string {
  if (text.includes('|')) return '';
  const translated = t(text);
  return translated !== text ? translated : '';
}

function apply(text: string, rules: Rule[]): string | null {
  for (const [pattern, build] of rules) {
    const match = text.match(pattern);
    if (match) return build(match);
  }
  return null;
}

/** A status word written by the server ("voided", "pending_approval"...) */
export function statusText(status: string): string {
  const key = status.trim().replace(/_/g, ' ').toLowerCase();
  switch (key) {
    case 'draft':
      return t('draft|state');
    case 'held':
      return t('held|state');
    case 'payment pending':
      return t('payment pending|state');
    case 'pending':
      return t('pending|state');
    case 'completed':
      return t('completed|state');
    case 'cancelled':
      return t('cancelled|state');
    case 'voided':
    case 'void':
      return t('voided|state');
    case 'refunded':
      return t('refunded|state');
    case 'partially refunded':
      return t('partially refunded|state');
    case 'open':
      return t('open|state');
    case 'closed':
      return t('closed|state');
    case 'submitted':
      return t('submitted|state');
    case 'approved':
      return t('approved|state');
    case 'rejected':
      return t('rejected|state');
    case 'paid':
      return t('paid|state');
    case 'pending approval':
      return t('pending approval|state');
    case 'in progress':
      return t('in progress|state');
    case 'in transit':
      return t('in transit|state');
    case 'received':
      return t('received|state');
    case 'expired':
      return t('expired|state');
    case 'accepted':
      return t('accepted|state');
    case 'declined':
      return t('declined|state');
    case 'converted':
      return t('converted|state');
    case 'sent':
      return t('sent|state');
    case 'active':
      return t('active|state');
    case 'inactive':
      return t('inactive|state');
    case 'blocked':
      return t('blocked|state');
    case 'resolved':
      return t('resolved|state');
    case 'dismissed':
      return t('dismissed|state');
    case 'failed':
      return t('failed|state');
    case 'posted':
      return t('posted|state');
    case 'requested':
      return t('requested|state');
    case 'dispatched':
      return t('dispatched|state');
    case 'partially dispatched':
      return t('partially dispatched|state');
    case 'partially received':
      return t('partially received|state');
    case 'issued':
      return t('issued|state');
    case 'suspended':
      return t('suspended|state');
    case 'invited':
      return t('invited|state');
    case 'queued':
      return t('queued|state');
    case 'printing':
      return t('printing|state');
    case 'printed':
      return t('printed|state');
    case 'discontinued':
      return t('discontinued|state');
    default:
      return status.replace(/_/g, ' ');
  }
}

// ---------------------------------------------------------------------------
// Error messages

// Entity names used by the server's generic messages ("Supplier not found"...)
const entityName = (name: string) => exact(name) || name;

// An action refused by a status check, as the verb to use in the sentence
// ("A draft transfer cannot be dispatched", "Cannot pay an expense that is draft")
function actionVerb(action: string): string {
  switch (action.trim()) {
    case 'edit':
    case 'edited':
      return t('edit|transition');
    case 'submit':
    case 'submitted':
      return t('submit|transition');
    case 'submitted for approval':
      return t('submit for approval|transition');
    case 'approve':
    case 'approved':
      return t('approve|transition');
    case 'reject':
    case 'rejected':
      return t('reject|transition');
    case 'dispatch':
    case 'dispatched':
      return t('dispatch|transition');
    case 'receive':
    case 'received':
      return t('receive|transition');
    case 'written off':
      return t('write off|transition');
    case 'cancel':
    case 'cancelled':
      return t('cancel|transition');
    case 'issue':
    case 'issued':
      return t('issue|transition');
    case 'revise':
    case 'revised':
      return t('revise|transition');
    case 'close':
    case 'closed':
      return t('close|transition');
    case 'pay':
    case 'paid':
      return t('pay|transition');
    default:
      return action;
  }
}

// Field named by a class-validator message ("each value in tags" for arrays)
const field = (m: RegExpMatchArray) => (m[1] ? t('each value in {field}', { field: m[2] }) : m[2]);
const FIELD = '(each value in )?([\\w.[\\]-]+)';
const validation = (rest: string) => new RegExp(`^${FIELD} ${rest}$`);

// Permission keys listed by the server, as their names
const permissionList = (keys: string) =>
  keys
    .split(', ')
    .map((key) => permissionLabel(key))
    .join(', ');

const errorRules = (): Rule[] => [
  // Stock
  [/^Not enough stock \((.+) on hand\)$/, (m) => t('Not enough stock ({count} on hand)', { count: m[1] })],
  [/^Not enough stock \((.+) available\)$/, (m) => t('Not enough stock ({count} available)', { count: m[1] })],
  [/^Not enough stock to reserve \((.+) available\)$/, (m) => t('Not enough stock to reserve ({count} available)', { count: m[1] })],
  [/^Quantity must be a whole number of (.+)$/, (m) => t('Quantity must be a whole number of {unit}', { unit: m[1] })],
  [/^Quantity can have at most (\d+) decimals? \((.+)\)$/, (m) => t('Quantity can have at most {count} decimal(s) ({unit})', { count: m[1], unit: m[2] })],
  [/^Quantity can have at most (\d+) decimals?$/, (m) => t('Quantity can have at most {count} decimal(s)', { count: m[1] })],
  // Sales
  [/^(.+) is not available for sale$/, (m) => t('{name} is not available for sale', { name: m[1] })],
  [/^Give a reason for the discount on line (\d+) \(above (.+)%\)$/, (m) => t('Give a reason for the discount on line {line} (above {max}%)', { line: m[1], max: m[2] })],
  [/^Give a reason for the discount on the sale \(above (.+)%\)$/, (m) => t('Give a reason for the discount on the sale (above {max}%)', { max: m[1] })],
  [/^Payments \((.+)\) do not cover the total \((.+)\)$/, (m) => t('Payments ({paid}) do not cover the total ({total})', { paid: m[1], total: m[2] })],
  [/^Give the amount paid in (.+) \(tenderedAmount\)$/, (m) => t('Give the amount paid in {currency}', { currency: m[1] })],
  [/^(.+) is not accepted by this store$/, (m) => t('{currency} is not accepted by this store', { currency: m[1] })],
  [/^(.+) can't be used offline$/, (m) => t("{method} can't be used offline", { method: m[1] })],
  [/^(.+) is always paid in the store currency$/, (m) => t('{method} is always paid in the store currency', { method: m[1] })],
  [/^The exchange credit \((.+)\) must be used in full$/, (m) => t('The exchange credit ({amount}) must be used in full', { amount: m[1] })],
  [/^This cart is already (.+)$/, (m) => t('This cart is already {status}', { status: statusText(m[1]) })],
  [/^This customer has already used this discount (\d+) times$/, (m) => t('This customer has already used this discount {count} times', { count: m[1] })],
  [/^Discount code (.+) not found$/, (m) => t('Discount code {code} not found', { code: m[1] })],
  [/^Estimate (.+) is for another customer$/, (m) => t('Estimate {number} is for another customer', { number: m[1] })],
  [/^Estimate (.+) has expired$/, (m) => t('Estimate {number} has expired', { number: m[1] })],
  [/^Estimate (\S+) is (\w+)$/, (m) => t('Estimate {number} is {status}', { number: m[1], status: statusText(m[2]) })],
  [/^This estimate is already (\w+)$/, (m) => t('This estimate is already {status}', { status: statusText(m[1]) })],
  [/^A (\w+) estimate can't be edited\. Duplicate it instead\.$/, (m) => t("A {status} estimate can't be edited. Duplicate it instead.", { status: statusText(m[1]) })],
  [/^A (.+) sale cannot become (.+)$/, (m) => t('A {from} sale cannot become {to}', { from: statusText(m[1]), to: statusText(m[2]) })],
  [
    /^This sale takes the customer over their credit limit \((.+) available\)\. A manager's approval is needed\.$/,
    (m) => t("This sale takes the customer over their credit limit ({amount} available). A manager's approval is needed.", { amount: m[1] }),
  ],
  // Gift cards, store credit, loyalty
  [/^The customer has (.+) of store credit$/, (m) => t('The customer has {amount} of store credit', { amount: m[1] })],
  [/^Not enough balance: (.+) available$/, (m) => t('Not enough balance: {amount} available', { amount: m[1] })],
  [/^Gift card ending (.+) is already in use$/, (m) => t('Gift card ending {last4} is already in use', { last4: m[1] })],
  [/^Gift card ending (.+) has been used and can't be cancelled$/, (m) => t("Gift card ending {last4} has been used and can't be cancelled", { last4: m[1] })],
  [/^At least (.+) points must be used at once$/, (m) => t('At least {count} points must be used at once', { count: m[1] })],
  [/^The customer has (.+) points \(worth (.+)\)$/, (m) => t('The customer has {count} points (worth {amount})', { count: m[1], amount: m[2] })],
  [/^At most (.+)% of a sale can be paid with points$/, (m) => t('At most {percent}% of a sale can be paid with points', { percent: m[1] })],
  [/^The customer only has (.+) points$/, (m) => t('The customer only has {count} points', { count: m[1] })],
  // Returns
  [/^No sale found with number (.+)$/, (m) => t('No sale found with number {number}', { number: m[1] })],
  [/^This sale is (\w+) and can't be returned$/, (m) => t("This sale is {status} and can't be returned", { status: statusText(m[1]) })],
  [/^Only (.+) × (.+) can still be returned$/, (m) => t('Only {count} × {name} can still be returned', { count: m[1], name: m[2] })],
  [/^This exchange is (\w+): its credit can't be refunded$/, (m) => t("This exchange is {status}: its credit can't be refunded", { status: statusText(m[1]) })],
  [/^Only (.+) of exchange credit is left to refund$/, (m) => t('Only {amount} of exchange credit is left to refund', { amount: m[1] })],
  [
    /^The original payments can't cover this refund \((.+) already refunded\)\. Choose how to refund it\.$/,
    (m) => t("The original payments can't cover this refund ({amount} already refunded). Choose how to refund it.", { amount: m[1] }),
  ],
  [/^Refunds \((.+)\) must equal the return total \((.+)\)$/, (m) => t('Refunds ({amount}) must equal the return total ({total})', { amount: m[1], total: m[2] })],
  [/^(.+) refunds must go back to a (.+) payment from this sale$/, (m) => t('{method} refunds must go back to a {method} payment from this sale', { method: m[1] })],
  [
    /^This sale is older than the (\d+)-day return window\. A manager must approve the return\.$/,
    (m) => t('This sale is older than the {days}-day return window. A manager must approve the return.', { days: m[1] }),
  ],
  // Shifts and cash
  [/^Shift (.+) is closed; cash can no longer be posted to it$/, (m) => t('Shift {number} is closed; cash can no longer be posted to it', { number: m[1] })],
  [/^Register (.+) already has an open shift \((.+)\)$/, (m) => t('Register {name} already has an open shift ({number})', { name: m[1], number: m[2] })],
  [/^Register (.+) already has an open shift$/, (m) => t('Register {name} already has an open shift', { name: m[1] })],
  [/^Count the (.+) cash in the drawer too$/, (m) => t('Count the {currency} cash in the drawer too', { currency: m[1] })],
  [/^The counted (.+) cash must be 0 or more$/, (m) => t('The counted {currency} cash must be 0 or more', { currency: m[1] })],
  // Customer accounts
  [/^(.+) payments need a reference$/, (m) => t('{method} payments need a reference', { method: m[1] })],
  [/^The customer owes (.+): a payment can't be more than that$/, (m) => t("The customer owes {amount}: a payment can't be more than that", { amount: m[1] })],
  [/^Non-cash payments over (.+) need a manager's approval\.$/, (m) => t("Non-cash payments over {amount} need a manager's approval.", { amount: m[1] })],
  [/^A store can define at most (\d+) customer fields$/, (m) => t('A store can define at most {count} customer fields', { count: m[1] })],
  // Inventory
  [
    /^Receiving more than was dispatched \(over the (.+)% tolerance\) needs approval$/,
    (m) => t('Receiving more than was dispatched (over the {percent}% tolerance) needs approval', { percent: m[1] }),
  ],
  [/^A count can have at most (\d+) lines; count by category instead$/, (m) => t('A count can have at most {count} lines; count by category instead', { count: m[1] })],
  [/^This count is (.+)$/, (m) => t('This count is {status}', { status: statusText(m[1]) })],
  [/^Only (.+) unit\(s\) can be reported missing on a line \((.+) given\)$/, (m) => t('Only {count} unit(s) can be reported missing on a line ({given} given)', { count: m[1], given: m[2] })],
  [/^The reason is too long \((\d+) characters max\)$/, (m) => t('The reason is too long ({count} characters max)', { count: m[1] })],
  // Purchasing
  [/^Supplier (.+) is blocked; goods cannot be received from it$/, (m) => t('Supplier {name} is blocked; goods cannot be received from it', { name: m[1] })],
  [/^Supplier (.+) is (\w+); activate it before ordering$/, (m) => t('Supplier {name} is {status}; activate it before ordering', { name: m[1], status: statusText(m[2]) })],
  [/^Only (.+) is still owed on an invoice$/, (m) => t('Only {amount} is still owed on an invoice', { amount: m[1] })],
  [/^Only (.+) is left to allocate$/, (m) => t('Only {amount} is left to allocate', { amount: m[1] })],
  [
    /^Only (.+) unit\(s\) of a receipt line can still be returned \((.+) requested\)$/,
    (m) => t('Only {count} unit(s) of a receipt line can still be returned ({requested} requested)', { count: m[1], requested: m[2] }),
  ],
  [/^(.+) was already received and cannot be removed from the order$/, (m) => t('{sku} was already received and cannot be removed from the order', { sku: m[1] })],
  [/^(.+): (.+) unit\(s\) were already received; order at least that many$/, (m) => t('{sku}: {count} unit(s) were already received; order at least that many', { sku: m[1], count: m[2] })],
  // Payments
  [/^Only failed payments can be retried \(this one is (\w+)\)$/, (m) => t('Only failed payments can be retried (this one is {status})', { status: statusText(m[1]) })],
  [/^Settlement batch (.+) was already imported$/, (m) => t('Settlement batch {reference} was already imported', { reference: m[1] })],
  [/^Row (\d+): amount is missing$/, (m) => t('Row {row}: amount is missing', { row: m[1] })],
  [/^Row (\d+): date "(.*)" is not a date$/, (m) => t('Row {row}: date "{value}" is not a date', { row: m[1], value: m[2] })],
  // Catalog
  [/^Product with SKU (.+) already exists$/, (m) => t('Product with SKU {sku} already exists', { sku: m[1] })],
  [/^(?:A variant|Variant) with SKU (.+) already exists$/, (m) => t('A variant with SKU {sku} already exists', { sku: m[1] })],
  [/^Product with SKU (.+) not found$/, (m) => t('Product with SKU {sku} not found', { sku: m[1] })],
  [/^Variant with SKU (.+) not found$/, (m) => t('Variant with SKU {sku} not found', { sku: m[1] })],
  [/^Variant with barcode (.+) not found$/, (m) => t('Variant with barcode {barcode} not found', { barcode: m[1] })],
  [/^Barcode (.+) is already used by another product$/, (m) => t('Barcode {barcode} is already used by another product', { barcode: m[1] })],
  [/^Barcode (.+) is already used by (.+)$/, (m) => t('Barcode {barcode} is already used by {sku}', { barcode: m[1], sku: m[2] })],
  [/^PLU (.+) is already used by (.+)$/, (m) => t('PLU {plu} is already used by {sku}', { plu: m[1], sku: m[2] })],
  [/^This variant already has barcode (.+)$/, (m) => t('This variant already has barcode {barcode}', { barcode: m[1] })],
  [/^A variant can have at most (\d+) barcodes$/, (m) => t('A variant can have at most {count} barcodes', { count: m[1] })],
  [/^A product can have at most (\d+) images$/, (m) => t('A product can have at most {count} images', { count: m[1] })],
  [/^Images can be at most (.+) MB$/, (m) => t('Images can be at most {size} MB', { size: m[1] })],
  [/^Unit code (.+) already exists$/, (m) => t('Unit code {code} already exists', { code: m[1] })],
  [/^(\d+) product\(s\) use this unit: deactivate it instead$/, (m) => t('{count} product(s) use this unit: deactivate it instead', { count: m[1] })],
  [/^This attribute is used by (\d+) variant\(s\) and cannot be deleted$/, (m) => t('This attribute is used by {count} variant(s) and cannot be deleted', { count: m[1] })],
  [/^Variant (.+) already has these options$/, (m) => t('Variant {sku} already has these options', { sku: m[1] })],
  [/^That would create (\d+) variants; the limit is (\d+)$/, (m) => t('That would create {count} variants; the limit is {max}', { count: m[1], max: m[2] })],
  [/^Choose at least one value for (.+)$/, (m) => t('Choose at least one value for {name}', { name: m[1] })],
  [
    /^(.+) has a decimal quantity in stock: count it to whole units before turning decimals off$/,
    (m) => t('{sku} has a decimal quantity in stock: count it to whole units before turning decimals off', { sku: m[1] }),
  ],
  // Staff and roles
  [/^(\d+) member\(s\) still have this role\. Change their role first\.$/, (m) => t('{count} member(s) still have this role. Change their role first.', { count: m[1] })],
  [/^A role with key (.+) already exists$/, (m) => t('A role with key {key} already exists', { key: m[1] })],
  [/^You cannot give the role "(.+)"$/, (m) => t('You cannot give the role "{name}"', { name: exact(m[1]) || m[1] })],
  [/^Unknown role: (.+)$/, (m) => t('Unknown role: {role}', { role: m[1] })],
  [/^This account is already linked to (.+)$/, (m) => t('This account is already linked to {name}', { name: m[1] })],
  [/^A report covers at most (\d+) days$/, (m) => t('A report covers at most {count} days', { count: m[1] })],
  // Documents, reports, imports, settings
  [
    /^This receipt was already e-mailed (\d+) times in the last 24 hours\. Share a link or print it instead\.$/,
    (m) => t('This receipt was already e-mailed {count} times in the last 24 hours. Share a link or print it instead.', { count: m[1] }),
  ],
  [
    /^This report has (\d+) rows: use "Export in background" for more than (\d+)$/,
    (m) => t('This report has {count} rows: use "Export in background" for more than {max}', { count: m[1], max: m[2] }),
  ],
  [
    /^You need one of these permissions for this report: (.+)$/,
    (m) => t('You need one of these permissions for this report: {permissions}', { permissions: m[1].split(', ').map((key) => permissionLabel(key)).join(', ') }),
  ],
  [
    /^(\d+) row\(s\) have errors\. Fix them, or import with skipInvalid to leave them out\.$/,
    (m) => t('{count} row(s) have errors. Fix them, or leave them out of the import.', { count: m[1] }),
  ],
  [/^The file has (\d+) rows; import at most (\d+) at a time$/, (m) => t('The file has {count} rows; import at most {max} at a time', { count: m[1], max: m[2] })],
  [/^Duplicate columns: (.+)$/, (m) => t('Duplicate columns: {columns}', { columns: m[1] })],
  [/^Could not read the CSV file: (.+)$/, (m) => t('Could not read the CSV file: {reason}', { reason: m[1] })],
  [/^(.+) is not a currency code$/, (m) => t('{code} is not a currency code', { code: m[1] })],
  [/^(.+) is the store currency; it needs no exchange rate$/, (m) => t('{code} is the store currency; it needs no exchange rate', { code: m[1] })],
  [/^The (.+) rate must be a positive number$/, (m) => t('The {code} rate must be a positive number', { code: m[1] })],
  // Product import: problems of a row of the file
  [/^Not imported: ([\s\S]+)$/, (m) => t('Not imported: {reason}', { reason: translateServerError(m[1]) })],
  [/^Batch (\d+) of (\d+) failed: ([\s\S]+)$/, (m) => t('Batch {batch} of {total} failed: {reason}', { batch: m[1], total: m[2], reason: translateServerError(m[3]) })],
  [/^Duplicate SKU \(also on line (\d+)\)$/, (m) => t('Duplicate SKU (also on line {line})', { line: m[1] })],
  [/^Duplicate barcode \(also on line (\d+)\)$/, (m) => t('Duplicate barcode (also on line {line})', { line: m[1] })],
  [/^Unknown category code "(.*)"$/, (m) => t('Unknown category code "{code}"', { code: m[1] })],
  [/^Unknown tax category code "(.*)"$/, (m) => t('Unknown tax category code "{code}"', { code: m[1] })],
  [/^product_type can't be changed by import \(the product is (\w+)\)$/, (m) => t("product_type can't be changed by import (the product is {type})", { type: m[1] })],
  [/^(\w+) can only be imported for simple products; set it on the variants$/, (m) => t('{column} can only be imported for simple products; set it on the variants', { column: m[1] })],
  [/^(\w+) must be a positive number \(got "(.*)"\)$/, (m) => t('{column} must be a positive number (got "{value}")', { column: m[1], value: m[2] })],
  [/^(\w+) must be a whole number \(got "(.*)"\)$/, (m) => t('{column} must be a whole number (got "{value}")', { column: m[1], value: m[2] })],
  [/^(\w+) must be one of (.+) \(got "(.*)"\)$/, (m) => t('{column} must be one of {values} (got "{value}")', { column: m[1], values: m[2], value: m[3] })],
  [/^(\w+) is too large$/, (m) => t('{column} is too large', { column: m[1] })],
  // Customer fields defined by the store (the field's name is the store's own)
  [/^Unknown customer field "(.*)"$/, (m) => t('Unknown customer field "{key}"', { key: m[1] })],
  [/^(?!(?:A|An|The|This|Your) )(.+) is longer than (\d+) characters$/, (m) => t('{name} is longer than {max} characters', { name: m[1], max: m[2] })],
  [/^(?!(?:A|An|The|This|Your) )(.+) must be text$/, (m) => t('{name} must be text', { name: m[1] })],
  [/^(?!(?:A|An|The|This|Your) )(.+) must be a date \(YYYY-MM-DD\)$/, (m) => t('{name} must be a date (YYYY-MM-DD)', { name: m[1] })],
  [/^(?!(?:A|An|The|This|Your) )(.+) must be yes or no$/, (m) => t('{name} must be yes or no', { name: m[1] })],
  [/^(?!(?:A|An|The|This|Your) )(.+) must be one of: (.*)$/, (m) => t('{name} must be one of: {values}', { name: m[1], values: m[2] })],
  // Status checks (transfers, purchase orders, expenses, print jobs...)
  [/^A (.+) transfer cannot be (.+)$/, (m) => t('A {status} transfer cannot be {action}', { status: statusText(m[1]), action: actionVerb(m[2]) })],
  [/^A (.+) purchase order cannot be (.+)$/, (m) => t('A {status} purchase order cannot be {action}', { status: statusText(m[1]), action: actionVerb(m[2]) })],
  [/^Cannot (\w+) an expense that is (\w+)$/, (m) => t('Cannot {action} an expense that is {status}', { action: actionVerb(m[1]), status: statusText(m[2]) })],
  [/^Cannot mark a print job that is (\w+) as (\w+)$/, (m) => t('Cannot mark a print job that is {status} as {to}', { status: statusText(m[1]), to: statusText(m[2]) })],
  [/^This case is already (\w+)$/, (m) => t('This case is already {status}', { status: statusText(m[1]) })],
  [/^Only (.+) unit\(s\) can be dispatched on a line \((.+) given\)$/, (m) => t('Only {count} unit(s) can be dispatched on a line ({given} given)', { count: m[1], given: m[2] })],
  [/^Only (.+) unit\(s\) can be received on a line \((.+) given\)$/, (m) => t('Only {count} unit(s) can be received on a line ({given} given)', { count: m[1], given: m[2] })],
  [/^Only (.+) unit\(s\) can be written off on a line \((.+) given\)$/, (m) => t('Only {count} unit(s) can be written off on a line ({given} given)', { count: m[1], given: m[2] })],
  // Inventory, catalog, purchasing, payments
  [/^The store already uses (\w+)$/, (m) => t('The store already uses {method}', { method: m[1] === 'average' ? t('average cost|costing') : m[1] === 'fifo' ? 'FIFO' : m[1] })],
  [/^Stock movement (.+) was already posted with another quantity$/, (m) => t('Stock movement {id} was already posted with another quantity', { id: m[1] })],
  [/^(.+) is not a variant attribute$/, (m) => t('{name} is not a variant attribute', { name: m[1] })],
  [/^(.+) is not an option of (.+)$/, (m) => t('{values} is not an option of {name}', { values: m[1], name: m[2] })],
  [/^The check digit of this (.+) barcode is wrong: check it for a typo$/, (m) => t('The check digit of this {format} barcode is wrong: check it for a typo', { format: m[1] })],
  [/^Unknown payment provider "(.*)"$/, (m) => t('Unknown payment provider "{name}"', { name: m[1] })],
  [/^Payment provider (.+) is not available$/, (m) => t('Payment provider {name} is not available', { name: m[1] })],
  [/^Row (\d+): (\w+) "(.*)" is not a valid amount$/, (m) => t('Row {row}: {column} "{value}" is not a valid amount', { row: m[1], column: m[2], value: m[3] })],
  [/^Price (.+)% above the order \(tolerance (.+)%\)$/, (m) => t('Price {percent}% above the order (tolerance {tolerance}%)', { percent: m[1], tolerance: m[2] })],
  [/^Billed (.+) unit\(s\) more than received and not yet invoiced$/, (m) => t('Billed {count} unit(s) more than received and not yet invoiced', { count: m[1] })],
  // Sales: discounts and approvals
  [/^Discounts above (.+)% need a manager(?:'s)? approval$/, (m) => t("Discounts above {max}% need a manager's approval", { max: m[1] })],
  [/^Line (\d+): (.+)% discount \(limit (.+)%\)$/, (m) => t('Line {line}: {percent}% discount (limit {max}%)', { line: m[1], percent: m[2], max: m[3] })],
  [/^Line (\d+): price (.+) → (.+)$/, (m) => t('Line {line}: price {from} → {to}', { line: m[1], from: m[2], to: m[3] })],
  [/^Cart discount of (.+)% \(limit (.+)%\)$/, (m) => t('Cart discount of {percent}% (limit {max}%)', { percent: m[1], max: m[2] })],
  [/^Minimum purchase of (.+) required for (.+)$/, (m) => t('Minimum purchase of {amount} required for {code}', { amount: m[1], code: m[2] })],
  [/^No items in the cart qualify for (.+)$/, (m) => t('No items in the cart qualify for {code}', { code: m[1] })],
  [/^A gift card code has (\d+) to (\d+) characters, with letters and digits$/, (m) => t('A gift card code has {min} to {max} characters, with letters and digits', { min: m[1], max: m[2] })],
  [/^(.+) was not used on this sale$/, (m) => t('{method} was not used on this sale', { method: m[1] })],
  [
    /^Refunding to a different payment method than the sale was paid with needs a manager's approval \((.+)\)$/,
    (m) => t("Refunding to a different payment method than the sale was paid with needs a manager's approval ({methods})", { methods: m[1] }),
  ],
  // Roles and reports
  [
    /^(.+): it includes permissions you do not have yourself \((.+)\)$/,
    (m) => t('{action}: it includes permissions you do not have yourself ({permissions})', { action: translateServerError(m[1]), permissions: permissionList(m[2]) }),
  ],
  [/^Unknown permissions: (.+)$/, (m) => t('Unknown permissions: {permissions}', { permissions: m[1] })],
  [/^Unknown report: (.+)$/, (m) => t('Unknown report: {key}', { key: m[1] })],
  // Checks of the request's fields (class-validator); the field keeps its technical name
  [/^property (\S+) should not exist$/, (m) => t('property {field} should not exist', { field: m[1] })],
  [/^nested property (\S+) must be either object or array$/, (m) => t('nested property {field} must be either object or array', { field: m[1] })],
  [validation('should not be empty'), (m) => t('{field} should not be empty', { field: field(m) })],
  [validation('must be a string'), (m) => t('{field} must be a string', { field: field(m) })],
  [validation('must be a UUID'), (m) => t('{field} must be a UUID', { field: field(m) })],
  [validation('must be an email'), (m) => t('{field} must be an email', { field: field(m) })],
  [validation('must be a boolean value'), (m) => t('{field} must be a boolean value', { field: field(m) })],
  [validation('must be an integer number'), (m) => t('{field} must be an integer number', { field: field(m) })],
  [validation('must be a number conforming to the specified constraints'), (m) => t('{field} must be a number', { field: field(m) })],
  [validation('must be a number with at most 4 decimals'), (m) => t('{field} must be a number with at most 4 decimals', { field: field(m) })],
  // Also the store's own customer fields ("Loyalty tier must be a number")
  [/^(each value in )?(?!(?:A|An|The|This|Your) )(.+) must be a number$/, (m) => t('{field} must be a number', { field: field(m) })],
  [validation('must be an array'), (m) => t('{field} must be an array', { field: field(m) })],
  [validation('must be an object'), (m) => t('{field} must be an object', { field: field(m) })],
  [validation('must be a valid ISO 8601 date string'), (m) => t('{field} must be a valid date', { field: field(m) })],
  [validation('must be a valid enum value'), (m) => t('{field} must be a valid value', { field: field(m) })],
  [validation('must not be less than (-?[\\d.]+)'), (m) => t('{field} must not be less than {min}', { field: field(m), min: m[3] })],
  [validation('must not be greater than (-?[\\d.]+)'), (m) => t('{field} must not be greater than {max}', { field: field(m), max: m[3] })],
  [
    validation('must be longer than or equal to (\\d+) and shorter than or equal to (\\d+) characters'),
    (m) => t('{field} must be {min} to {max} characters long', { field: field(m), min: m[3], max: m[4] }),
  ],
  [validation('must be shorter than or equal to (\\d+) characters'), (m) => t('{field} must be at most {max} characters long', { field: field(m), max: m[3] })],
  [validation('must be longer than or equal to (\\d+) characters'), (m) => t('{field} must be at least {min} characters long', { field: field(m), min: m[3] })],
  [validation('must contain no more than (\\d+) elements'), (m) => t('{field} can have at most {max} items', { field: field(m), max: m[3] })],
  [validation('must contain at least (\\d+) elements'), (m) => t('{field} needs at least {min} items', { field: field(m), min: m[3] })],
  [validation('must be one of the following values: (.*)'), (m) => t('{field} must be one of these values: {values}', { field: field(m), values: m[3] })],
  [validation('must match .+ regular expression'), (m) => t('{field} has an invalid format', { field: field(m) })],
  [
    validation('must be an object with (.+) keys and text values of at most (\\d+) characters'),
    (m) => t('{field} must have a text for each language ({languages}) of at most {max} characters', { field: field(m), languages: m[3], max: m[4] }),
  ],
  [
    validation('must be an object of at most (\\d+) bytes and (\\d+) levels deep'),
    (m) => t('{field} must be an object of at most {bytes} bytes and {depth} levels deep', { field: field(m), bytes: m[3], depth: m[4] }),
  ],
  // Framework messages
  [/^Cannot (GET|POST|PUT|PATCH|DELETE) (\S+)$/, (m) => t('This address does not exist ({request})', { request: `${m[1]} ${m[2]}` })],
  // Generic record messages ("Supplier not found"...)
  [/^An? (.+) with this code already exists$/, (m) => t('{name}: this code already exists', { name: entityName(m[1].charAt(0).toUpperCase() + m[1].slice(1)) })],
  [/^(?!(?:A|An|The|This|Your|No) )([^:]+) is required$/, (m) => t('{name} is required', { name: m[1] })],
  [/^(.+) is in use and cannot be deleted\. Deactivate it instead\.$/, (m) => t('{name} is in use and cannot be deleted. Deactivate it instead.', { name: entityName(m[1]) })],
  [/^(.+) not found$/, (m) => t('{name} not found', { name: entityName(m[1]) })],
];

/** A server error message in the user's language */
export function translateServerError(message: string): string {
  const text = message.trim();
  const fixed = exact(text);
  if (fixed) return fixed;
  const rebuilt = apply(text, errorRules());
  if (rebuilt !== null) return rebuilt;
  // "Apples: Quantity must be greater than zero": keep the name, translate the rest
  const named = text.match(/^([^:\n]{1,120}): ([\s\S]+)$/);
  if (named) {
    const rest = translateServerError(named[2]);
    if (rest !== named[2]) return `${named[1]}: ${rest}`;
  }
  return t(text);
}

// ---------------------------------------------------------------------------
// Notifications (their title and body are written by the server in English)

const notificationRules = (): Rule[] => [
  [/^Shift (.+) closed with a cash variance over tolerance$/, (m) => t('Shift {number} closed with a cash variance over tolerance', { number: m[1] })],
  [
    /^Expected (.+), counted (.+), variance (.+) \(tolerance (.+)\)\.$/,
    (m) => t('Expected {expected}, counted {counted}, variance {variance} (tolerance {tolerance}).', { expected: m[1], counted: m[2], variance: m[3], tolerance: m[4] }),
  ],
  [/^Low stock: (.+)$/, (m) => t('Low stock: {sku}', { sku: m[1] })],
  [
    /^(.+) \((.+)\) at (.+): (.+) available, minimum (.+)\.$/,
    (m) => t('{name} ({sku}) at {location}: {available} available, minimum {minimum}.', { name: m[1], sku: m[2], location: m[3], available: m[4], minimum: m[5] }),
  ],
  [/^(\d+) expense\(s\) waiting for approval$/, (m) => plural(Number(m[1]), '{count} expense waiting for approval', '{count} expenses waiting for approval')],
  [
    /^(\d+) purchase order\(s\) waiting for approval$/,
    (m) => plural(Number(m[1]), '{count} purchase order waiting for approval', '{count} purchase orders waiting for approval'),
  ],
  [/^(\d+) stock count\(s\) waiting for approval$/, (m) => plural(Number(m[1]), '{count} stock count waiting for approval', '{count} stock counts waiting for approval')],
  [
    /^(\d+) card payment\(s\) unresolved for more than (\d+) minutes$/,
    (m) =>
      plural(Number(m[1]), '{count} card payment unresolved for more than {minutes} minutes', '{count} card payments unresolved for more than {minutes} minutes', {
        minutes: m[2],
      }),
  ],
  [
    /^(\d+) card settlement line\(s\) not matched to a payment$/,
    (m) => plural(Number(m[1]), '{count} card settlement line not matched to a payment', '{count} card settlement lines not matched to a payment'),
  ],
  [/^Device (.+) has sales that did not reach the server$/, (m) => t('Device {name} has sales that did not reach the server', { name: m[1] })],
  [/^(\d+) queued, (\d+) failed\.$/, (m) => t('{queued} queued, {failed} failed.', { queued: m[1], failed: m[2] })],
  [/^(\d+) item\(s\) low on stock at a location$/, (m) => plural(Number(m[1]), '{count} item low on stock at a location', '{count} items low on stock at a location')],
  [/^(\d+) item\(s\) low on stock at (.+)$/, (m) => plural(Number(m[1]), '{count} item low on stock at {location}', '{count} items low on stock at {location}', { location: m[2] })],
  [/^(\S+) (.+): (.+) \(min (.+)\)$/, (m) => t('{sku} {name}: {available} (min {minimum})', { sku: m[1], name: m[2], available: m[3], minimum: m[4] })],
  [/^… and (\d+) more$/, (m) => t('… and {count} more', { count: m[1] })],
  [/^Reconciliation found issues in (\d+) check\(s\)$/, (m) => plural(Number(m[1]), 'Reconciliation found issues in {count} check', 'Reconciliation found issues in {count} checks')],
  [/^(.+): (\d+) issue\(s\)$/, (m) => plural(Number(m[2]), '{name}: {count} issue', '{name}: {count} issues', { name: exact(m[1]) || m[1] })],
  [/^(\d+) event\(s\) stuck or dead-lettered\. See System events\.$/, (m) => plural(Number(m[1]), '{count} event stuck or dead-lettered. See System events.', '{count} events stuck or dead-lettered. See System events.')],
];

/** A notification title or body (one alert per line) in the user's language */
export function translateNotificationText(text: string): string {
  return text
    .split('\n')
    .map((line) => exact(line) || apply(line, notificationRules()) || line)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Notes written by the server on account entries, loyalty and statements

const noteRules = (): Rule[] => [
  [/^Sale (\S+)$/, (m) => t('Sale {number}', { number: m[1] })],
  [/^Return (\S+)$/, (m) => t('Return {number}', { number: m[1] })],
  [/^Payment on account (\S+)$/, (m) => t('Payment on account {code}', { code: m[1] })],
  [/^Payment \((.+)\)$/, (m) => t('Payment ({method})', { method: m[1] })],
  [/^Kept from merged customer (\S+)$/, (m) => t('Kept from merged customer {code}', { code: m[1] })],
  [/^Points refunded on return (\S+)$/, (m) => t('Points refunded on return {number}', { number: m[1] })],
  [/^Exchange credit refunded \(return (\S+)\)$/, (m) => t('Exchange credit refunded (return {number})', { number: m[1] })],
  // The due date is a calendar day: read at local midnight, not UTC
  [/^Invoice due (\d{4}-\d{2}-\d{2})$/, (m) => t('Invoice due {date}', { date: formatDate(`${m[1]}T00:00:00`) })],
  [/^Handed over from (\S+)$/, (m) => t('Handed over from {number}', { number: m[1] })],
  // Card settlement lines matched to payments
  [/^Reference found but the amount differs \(payment (.+)\)$/, (m) => t('Reference found but the amount differs (payment {amount})', { amount: m[1] })],
  [/^(\d+) payments have this amount; match it by hand$/, (m) => t('{count} payments have this amount; match it by hand', { count: m[1] })],
];

/** A note the server wrote on an account entry or statement line ("Sale MAIN-000123") */
export function translateServerNote(note: string): string {
  return exact(note) || apply(note, noteRules()) || note;
}

// ---------------------------------------------------------------------------
// Permission catalog and built-in roles

const permissionLabels = (): Record<string, string> => ({
  'pos.sell': t('Sell at the till'),
  'pos.discount': t('Give discounts up to the store limit'),
  'pos.discount.override': t('Give discounts above the store limit'),
  'pos.price.override': t('Change an item price at the till'),
  'pos.hold': t('Hold and resume carts'),
  'sales.view': t('View sales'),
  'sales.reprint': t('Reprint receipts (marked COPY), e-mail or share them'),
  'sales.void': t('Void sales'),
  'sales.refund': t('Process returns and refunds'),
  'sales.refund.any_method': t('Refund to another payment method than the sale was paid with'),
  'sales.refund.goodwill': t('Give goodwill refunds (money back without goods)'),
  'sales.review': t('Review and resolve flagged sales (offline oversells, unapproved prices)'),
  'payments.reconcile': t('Reconcile card settlements'),
  'estimates.manage': t('Create and send estimates (quotes)'),
  'shifts.operate': t('Open and close own register shift'),
  'shifts.manage': t('Manage all shifts, paid-in/out, safe drops'),
  'expenses.create': t('Record expenses'),
  'expenses.approve': t('Approve expenses'),
  'customers.view': t('Look up customers'),
  'customers.create': t('Add customers'),
  'customers.manage': t('Edit and delete customers'),
  'customers.merge': t('Merge duplicate customers'),
  'customers.finance.view': t('See customer balances and credit limits'),
  'customers.credit.sell': t("Sell on account (charge the customer's account)"),
  'customers.credit.override': t('Sell on account above the credit limit'),
  'customers.credit.receive': t('Take payments on customer accounts'),
  'customers.credit.manage': t('Adjust customer accounts and stored value, set credit holds and payment terms'),
  'catalog.manage': t('Manage products and categories'),
  'catalog.import': t('Import products from CSV'),
  'pricing.manage': t('Manage price lists and tax categories'),
  'discounts.manage': t('Manage discount codes'),
  'inventory.view': t('View stock'),
  'inventory.cost.view': t('See product costs, margins and stock value'),
  'inventory.receive': t('Receive stock'),
  'inventory.adjust': t('Adjust stock'),
  'inventory.count': t('Run stock counts'),
  'inventory.count.approve': t('Approve stock count variances'),
  'inventory.transfer': t('Transfer stock between locations'),
  'inventory.transfer.approve': t('Approve stock transfers and over-receipts'),
  'purchasing.manage': t('Manage suppliers and purchase orders'),
  'purchasing.approve': t('Approve purchase orders'),
  'purchasing.receive.unplanned': t('Receive goods from a supplier without a purchase order'),
  'purchasing.payables': t('Record supplier invoices, credits and payments'),
  'reports.view': t('View reports and dashboard'),
  'reports.export': t('Export reports'),
  'users.manage': t('Manage staff accounts'),
  'employees.manage': t('Manage employees, their branches and attendance'),
  'roles.manage': t('Manage roles and permissions'),
  'settings.manage': t('Manage store settings'),
  'devices.manage': t('Manage registered devices'),
  'hardware.manage': t('Pair the print bridge, test receipt printers and cash drawers'),
  'audit.view': t('View the audit log'),
  'platform.operate': t('Monitor system events, background jobs and reconciliation'),
});

/** Name of a permission, from its key (the server's English label as fallback) */
export function permissionLabel(key: string, serverLabel?: string | null): string {
  return permissionLabels()[key] ?? (serverLabel ? t(serverLabel) : key);
}

/** Name of a permission group of the catalog */
export function permissionGroupLabel(group: string): string {
  switch (group) {
    case 'Point of sale':
      return t('Point of sale');
    case 'Sales':
      return t('Sales');
    case 'Cash':
      return t('Cash');
    case 'Customers':
      return t('Customers');
    case 'Catalog':
      return t('Catalog');
    case 'Inventory':
      return t('Inventory');
    case 'Purchasing':
      return t('Purchasing');
    case 'Reports':
      return t('Reports');
    case 'Administration':
      return t('Administration');
    default:
      return t(group);
  }
}

/**
 * Name of a role: the built-in roles' English names are translated; a store's own
 * roles keep the name the store gave them.
 */
export function roleLabel(name: string | null | undefined): string {
  switch (name) {
    case 'Owner':
      return t('Owner');
    case 'Admin':
      return t('Admin|role');
    case 'Manager':
      return t('Manager');
    case 'Cashier':
      return t('Cashier');
    default:
      return name ?? '';
  }
}

/** Description of a built-in role (a store's own descriptions are kept) */
export function roleDescription(description: string): string {
  switch (description) {
    case 'Full access, including other owners. Cannot be edited.':
      return t('Full access, including other owners. Cannot be edited.');
    case 'Runs the store and its staff accounts.':
      return t('Runs the store and its staff accounts.');
    case 'Runs day-to-day operations; cannot manage staff or roles.':
      return t('Runs day-to-day operations; cannot manage staff or roles.');
    case 'Sells at the till.':
      return t('Sells at the till.');
    default:
      return description;
  }
}
