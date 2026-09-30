'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CloudUpload,
  CreditCard,
  Keyboard,
  ListRestart,
  LogOut,
  Minus,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  StickyNote,
  Ticket,
  Trash2,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { NoPosAccess } from '@/components/auth/no-pos-access';
import { canSell } from '@/lib/landing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomerDialog } from '@/components/pos/customer-dialog';
import { DiscountDialog } from '@/components/pos/discount-dialog';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { PaymentDialog, TenderedPayment } from '@/components/pos/payment-dialog';
import { GiftCardDialog } from '@/components/pos/gift-card-dialog';
import { NewReturnDialog } from '@/components/admin/returns-new-dialog';
import { storedValueApi } from '@/lib/api/stored-value';
import { amountDueIn, buyRatesOf, exchangeRate, foreignChange, toSaleCurrency } from '@/lib/pos/currency-math';
import { ReceiptDialog } from '@/components/pos/receipt-dialog';
import { useScannerInput } from '@/lib/hardware/scanner';
import { useCustomerDisplayBroadcast } from '@/lib/hardware/customer-display';
import { PendingSalesDialog } from '@/components/pos/pending-sales-dialog';
import { HeldCartsDialog } from '@/components/pos/held-carts-dialog';
import { PaymentStatusDialog } from '@/components/pos/payment-status-dialog';
import { PriceDialog } from '@/components/pos/price-dialog';
import { RepricingDialog } from '@/components/pos/repricing-dialog';
import { QuantityDialog } from '@/components/pos/quantity-dialog';
import { ShortcutsDialog } from '@/components/pos/shortcuts-dialog';
import { SalespersonSelect, useStaff } from '@/components/pos/salesperson-select';
import { useApprovals } from '@/components/pos/use-approvals';
import { usePosShortcuts } from '@/components/pos/use-pos-shortcuts';
import { HelpButton } from '@/help/help-drawer';
import { useHelpContext } from '@/help/store';
import { useSmallScreen } from '@/components/pos/use-small-screen';
import { ShiftPanel } from '@/components/shifts/shift-panel';
import { DrawerOpenButton } from '@/components/shifts/drawer-open-button';
import { ClockButton } from '@/components/shifts/clock-button';
import { OfflineLeaseGuard } from '@/components/offline-lease-guard';
import { LOCAL_QUERY, useCatalog, useOnlineStatus, usePendingSales, usePosContext } from '@/hooks/use-pos-data';
import {
  CatalogItem,
  CreateSaleInput,
  CustomerGroupPricing,
  GiftCardLineInput,
  IssuedGiftCard,
  Quote,
  QuoteInput,
  Sale,
  posApi,
  salesApi,
} from '@/lib/api/sales';
import { customerName } from '@/lib/api/customers';
import { Discount, discountsApi } from '@/lib/api/discounts';
import { approvablePermission } from '@/lib/api/approvals';
import { getErrorMessage } from '@/lib/api/client';
import { text } from '@/lib/api/crud';
import { OfflineLeaseError, pendingSales } from '@/lib/pos/offline-db';
import { isNetworkError } from '@/lib/pos/sync';
import { addBlockedBy, quantityBlockedBy, stockShortfalls } from '@/lib/pos/stock-check';
import { addQty, formatQuantity, isMeasured, itemCount as countItems } from '@/lib/pos/quantity';
import { CurrentLine, QuotedTotals, Revalidation, revalidateCart } from '@/lib/pos/cart-revalidation';
import { round2 } from '@/lib/pos/sale-calculator';
import { parseWeightedBarcode, scannedQuantity } from '@/lib/pos/weighted-barcode';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  CartCustomer,
  catalogPriceOf,
  computeTotals,
  groupDiscountPercentOf,
  isPriceOverridden,
  usePOSStore,
} from '@/stores/pos-store';
import { canUseAdmin, hasPermission, useAuthStore } from '@/stores/auth-store';
import { plural, t } from '@/i18n';
import { randomId } from '@/lib/uuid';

export default function POSPage() {
  return (
    <ProtectedRoute>
      <POSGate />
    </ProtectedRoute>
  );
}

// Only users who sell get the till (its data would answer 403 for the others):
// the rest are sent to the admin area, or told they have no access
function POSGate() {
  const user = useAuthStore((state) => state.user);
  return canSell(user) ? <POSScreen /> : <NoPosAccess />;
}

// Help topic of each till dialog (src/help/content/<lang>/<id>.md)
const POS_DIALOG_TOPICS: Record<NonNullable<DialogName>, string> = {
  customer: 'pos-customer',
  discount: 'pos-discounts',
  payment: 'pos-payment',
  pending: 'offline-sync',
  held: 'pos-held-carts',
  shortcuts: 'pos-shortcuts',
  giftcard: 'pos-gift-cards',
  returns: 'returns-pos',
  menu: 'pos-phone',
};

type DialogName =
  | 'customer'
  | 'discount'
  | 'payment'
  | 'pending'
  | 'held'
  | 'shortcuts'
  | 'giftcard'
  | 'returns'
  | 'menu'
  | null;

// A cart priced longer ago than this is repriced before tendering (spec §5)
const REPRICE_AFTER_MS = 10 * 60_000;

// Resumed held cart, loaded estimate, or cart priced a while ago
const isStaleCart = (cart: { needsRevalidation: boolean; pricedAt: string | null }) =>
  cart.needsRevalidation || !cart.pricedAt || Date.now() - Date.parse(cart.pricedAt) > REPRICE_AFTER_MS;

// How a repricing check was started, kept to check again after a line is fixed
interface RepriceContext {
  trigger: 'resume' | 'checkout';
  // Where the units available come from: the resumed cart (fresh from the server),
  // the refreshed catalog, or not checked (fresh cart: the server checks at checkout)
  stock: 'cart' | 'catalog' | null;
  // Total of the held cart (server figure), until a line is changed
  heldTotal?: number | null;
  // Discount code found invalid when the cart was resumed
  discountCodeLost?: string | null;
}

function POSScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const online = useOnlineStatus();
  const { data: context, isLoading: contextLoading, error: contextError } = usePosContext();
  const pos = usePOSStore();
  const { registerId, setRegister, cart } = pos;
  const approvals = useApprovals();
  // Phones: products and cart are two views (tablets and desktops show both side by side)
  const smallScreen = useSmallScreen();
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
  // Brief "added" feedback on phones, where the cart is not in sight
  const [added, setAdded] = useState<{ product: string; at: number } | null>(null);
  const addedCount = useRef(0);
  const badgeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!added) return;
    badgeRef.current?.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }],
      { duration: 350, easing: 'ease-out' }
    );
    const timeout = setTimeout(() => setAdded(null), 1600);
    return () => clearTimeout(timeout);
  }, [added]);

  // Default to the first register; forget a register that no longer exists
  const registers = context?.registers ?? [];
  const register = registers.find((r) => r.id === registerId) ?? registers[0] ?? null;
  useEffect(() => {
    if (register && register.id !== registerId) setRegister(register.id);
  }, [register, registerId, setRegister]);

  const currency = register?.branch?.currencyCode ?? context?.settings.currencyCode ?? 'USD';
  const money = (value: number) => formatMoney(value, currency);
  const catalog = useCatalog(register?.id ?? null, online);
  const pending = usePendingSales(online);

  const canHold = hasPermission(user, 'pos.hold');
  const canOverridePrice = hasPermission(user, 'pos.price.override');
  const canOverrideDiscount = hasPermission(user, 'pos.discount.override');
  const maxDiscount = Number(context?.settings.maxDiscountPercent ?? 100);
  const { data: staff = [] } = useStaff();

  // ---- Product search ----
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Not on phones: focusing the search box would pop the on-screen keyboard after every action
  const focusSearch = () => {
    if (!smallScreen) setTimeout(() => searchRef.current?.focus(), 30);
  };

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: results = [], isFetching: searching } = useQuery({
    queryKey: ['pos', 'search', register?.id, debouncedSearch, categoryId, online, catalog.cachedAt],
    queryFn: () =>
      catalog.search({ search: debouncedSearch || undefined, categoryId: categoryId ?? undefined }),
    enabled: !!register,
    // Offline the search runs on the cached catalog: it must not pause with the network
    ...LOCAL_QUERY,
  });

  // ---- Customer group pricing ----
  // A customer's group may have its own price list (used automatically) and a discount
  // (taken off as the group discount). Choosing / removing the customer reprices the cart
  // with the server; offline, removing them goes back to the cached catalog prices.
  const priceForCustomer = async (customer: CartCustomer | null, variantIds?: string[]) => {
    if (!register) return null;
    const state = usePOSStore.getState();
    const ids = [...new Set(variantIds ?? state.cart.map((l) => l.variantId))];
    try {
      const result = await posApi.prices({ registerId: register.id, customerId: customer?.id, variantIds: ids });
      // The customer changed meanwhile: that choice reprices the cart itself
      if ((usePOSStore.getState().customer?.id ?? null) !== (customer?.id ?? null)) return null;
      // Group lists apply to what is sold now, not to an estimate's quoted prices
      if (!usePOSStore.getState().estimate) pos.updatePrices(new Map(Object.entries(result.prices)));
      return result.customerGroup;
    } catch {
      // The checkout quote prices the cart anyway
      return undefined;
    }
  };

  const chooseCustomer = async (customer: CartCustomer | null) => {
    const previous = usePOSStore.getState().customer;
    pos.setCustomer(customer ? { ...customer, group: null } : null);
    const hadGroupPrices = !!previous?.group?.priceListId;
    // Walk-in again after a customer without group prices: nothing to reprice
    if (!customer && !hadGroupPrices) return;
    if (!online) {
      if (!customer && hadGroupPrices && !usePOSStore.getState().estimate) {
        const cached = new Map((catalog.items ?? []).map((item) => [item.variantId, item.price]));
        pos.updatePrices(cached);
      }
      return;
    }
    const group = await priceForCustomer(customer);
    if (!customer || group === null || group === undefined) {
      if (group === undefined && customer) setNotice(t('Could not load the customer group prices. They are applied at checkout.'));
      return;
    }
    if (usePOSStore.getState().customer?.id !== customer.id) return;
    pos.setCustomer({ ...customer, group });
    setNotice(
      group.discountPercent > 0
        ? t('Group {name}: group prices and a {percent}% group discount apply.', {
            name: group.name,
            percent: group.discountPercent,
          })
        : t('Group {name}: group prices apply.', { name: group.name })
    );
  };

  // The customer's group as the last quote gave it: applied with the prices the cashier confirms
  const quotedGroup = useRef<CustomerGroupPricing | null | undefined>(undefined);
  const applyQuotedGroup = () => {
    const group = quotedGroup.current;
    quotedGroup.current = undefined;
    const customer = usePOSStore.getState().customer;
    if (group === undefined || !customer) return;
    if (JSON.stringify(customer.group ?? null) !== JSON.stringify(group)) pos.setCustomer({ ...customer, group });
  };

  // No negative stock (D018): never more in the cart than the catalog says is on the
  // shelf. Services are not limited. Online the server checks again at checkout.
  // Measured items (sold by weight / length / volume) need a quantity first: from the
  // scale label, else typed on the quantity pad
  const addToCart = (item: CatalogItem, quantity?: number) => {
    if (quantity === undefined && isMeasured(item.unit)) {
      setQuantityTarget({ item });
      return;
    }
    const limit = addBlockedBy(cart, item, quantity ?? 1);
    if (limit !== null) {
      setNotice(
        online
          ? t('Only {count} × {product} in stock', { count: limit, product: item.productName })
          : t('Only {count} × {product} in stock on this till (offline). Sell more once back online.', {
              count: limit,
              product: item.productName,
            })
      );
      return;
    }
    setNotice(null);
    pos.addItem(item, quantity ?? 1);
    // The customer's group has its own prices: the catalog item carries the price for everyone
    if (pos.customer?.group?.priceListId && !pos.estimate) void priceForCustomer(pos.customer, [item.variantId]);
    addedCount.current += 1;
    setAdded({ product: item.productName, at: addedCount.current });
  };

  // Quantity pad: a measured item being added, or a cart line whose quantity is edited
  const [quantityTarget, setQuantityTarget] = useState<{ item?: CatalogItem; key?: string } | null>(null);
  const quantityLine = quantityTarget?.key ? (cart.find((l) => l.key === quantityTarget.key) ?? null) : null;
  const applyQuantity = (quantity: number) => {
    if (quantityTarget?.item) addToCart(quantityTarget.item, quantity);
    else if (quantityTarget?.key) changeQuantity(quantityTarget.key, quantity);
  };

  // Offline the till cannot ask the server: quantities are held to the cached stock
  const changeQuantity = (key: string, quantity: number) => {
    const limit = online ? null : quantityBlockedBy(cart, key, quantity);
    if (limit !== null) {
      const line = cart.find((l) => l.key === key);
      setNotice(
        t('Only {count} × {product} in stock on this till (offline). Sell more once back online.', {
          count: limit,
          product: line?.productName ?? '',
        })
      );
      return;
    }
    pos.setQuantity(key, quantity);
  };

  // Scanner settings of this till (Admin → Hardware): terminator, timing, double reads
  // (Tab / no terminator: a scan submits the search form)
  const scanner = useScannerInput();

  // Barcode scanners type the code and press Enter
  const handleSearchEnter = async () => {
    const code = search.trim();
    if (!code) return;
    // The same code read twice in a row by the scanner: added once
    if (!scanner.accept(code)) {
      setSearch('');
      return;
    }
    // Scale labels (GS1 variable measure, prefixes 20–29): PLU + weight or price
    const settings = context?.settings;
    const weighed = parseWeightedBarcode(code, {
      prefixes: settings?.weightedBarcodePrefixes ?? [],
      layout: settings?.weightedBarcodeLayout ?? 'weight',
      itemCodeLength: settings?.weightedBarcodeItemCodeLength ?? 5,
      valueDecimals: settings?.weightedBarcodeValueDecimals ?? 3,
    });
    if (weighed && !weighed.ok) {
      setNotice(t('The check digit of this weighed label is wrong: scan it again'));
      setSearch('');
      return;
    }
    let matches: CatalogItem[] = await catalog.search({ barcode: code }).catch(() => []);
    if (weighed?.ok && !matches.some((m) => m.scan)) {
      // Offline (or an older server): the PLU is looked up in the cached catalog
      const byPlu = await catalog.search({ plu: weighed.plu }).catch(() => []);
      if (byPlu.length > 0) matches = byPlu;
    }
    if (weighed?.ok && matches.length === 1 && (matches[0].scan || matches[0].pluCode === weighed.plu)) {
      const item = matches[0];
      const quantity =
        item.scan?.quantity ?? scannedQuantity(weighed, item.price, item.unit?.precision ?? 0).quantity;
      if (quantity === null) {
        setNotice(t('Could not read a quantity from this label for {product}', { product: item.productName }));
      } else {
        // Each weighed label is its own line
        addToCart(item, quantity);
      }
      setSearch('');
      return;
    }
    if (matches.length === 1) {
      addToCart(matches[0]);
      setSearch('');
    } else if (matches.length === 0 && results.length === 1) {
      addToCart(results[0]);
      setSearch('');
    } else if (matches.length === 0 && results.length === 0) {
      setNotice(t('No product found for "{code}"', { code }));
    }
  };

  // ---- Totals ----
  const tax = { taxRate: context?.taxRate ?? 0, pricesIncludeTax: context?.settings.pricesIncludeTax ?? false };
  const totals = useMemo(
    () =>
      computeTotals(
        { cart, discount: pos.discount, cartDiscount: pos.cartDiscount, customer: pos.customer, estimate: pos.estimate },
        tax
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, pos.discount, pos.cartDiscount, pos.customer, pos.estimate, tax.taxRate, tax.pricesIncludeTax]
  );
  // Customer group discount on this cart (shown as its own total row)
  const groupPercent = groupDiscountPercentOf(pos);
  const groupName = pos.customer?.group?.name ?? '';
  // Pieces count by quantity; each weighed (measured) line counts once
  const itemCount = countItems(cart);
  // Products can have their own tax rate (tax categories): show the rate only when there is one
  const lineRates = [...new Set(cart.map((l) => l.taxRate ?? tax.taxRate))];
  const taxName = tax.pricesIncludeTax ? t('Tax included') : t('Tax');
  const taxLabel =
    lineRates.length > 1
      ? taxName
      : t(tax.pricesIncludeTax ? 'Tax included ({rate}%)' : 'Tax ({rate}%)', { rate: lineRates[0] ?? tax.taxRate });

  // ---- Selected line (keyboard +/-) ----
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = cart.find((l) => l.key === selectedKey) ?? cart[cart.length - 1] ?? null;
  const moveSelection = (step: number) => {
    if (cart.length === 0) return;
    const index = selected ? cart.findIndex((l) => l.key === selected.key) : -1;
    const next = cart[Math.min(Math.max(index + step, 0), cart.length - 1)];
    setSelectedKey(next.key);
    document.getElementById(`cart-line-${next.key}`)?.scrollIntoView({ block: 'nearest' });
  };

  // ---- Dialogs ----
  const [dialog, setDialogState] = useState<DialogName>(null);
  const setDialog = (next: DialogName) => {
    setDialogState(next);
    // Back to the search box after every action, ready for the next scan
    if (!next) focusSearch();
  };
  const [priceKey, setPriceKey] = useState<string | null>(null);
  // Cart line whose note is being typed
  const [noteKey, setNoteKey] = useState<string | null>(null);

  // ---- Checkout ----
  const [amountDue, setAmountDue] = useState(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<{ sale: Sale; offline: boolean } | null>(null);
  // Second screen facing the customer (/customer-display), same PC, no server
  useCustomerDisplayBroadcast(
    context
      ? completed
        ? {
            type: 'complete',
            storeName: context.settings.storeName,
            currency,
            total: Number(completed.sale.total),
            change: Number(completed.sale.changeAmount),
          }
        : {
            type: 'cart',
            storeName: context.settings.storeName,
            currency,
            lines: cart.map((line, i) => ({
              key: line.key,
              name: `${line.productName}${line.variantName ? ` (${line.variantName})` : ''}`,
              quantity: line.quantity,
              total: (totals.lines[i]?.subtotal ?? 0) - (totals.lines[i]?.discountAmount ?? 0),
            })),
            subtotal: totals.subtotal,
            discount: totals.discountAmount,
            tax: totals.taxAmount,
            total: totals.total,
          }
      : null
  );
  const [awaitingPayment, setAwaitingPayment] = useState<Sale | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  // Manager approvals collected at the quote, reused for the sale itself
  const approvalTokens = useRef<string[]>([]);
  // Gift cards sold with this sale (lines of their own: no tax, no discount; online only)
  const [giftCards, setGiftCards] = useState<GiftCardLineInput[]>([]);
  const giftTotal = giftCards.reduce((sum, card) => sum + Math.round(card.amount * 100), 0) / 100;
  const grandTotal = Math.round((totals.total + giftTotal) * 100) / 100;
  const hasLines = cart.length > 0 || giftCards.length > 0;
  // Codes of the gift cards the last sale issued (shown once, never stored)
  const [issuedCards, setIssuedCards] = useState<IssuedGiftCard[]>([]);
  // The customer's store credit, offered as a tender at checkout
  const { data: storeCredit } = useQuery({
    queryKey: ['pos', 'store-credit', pos.customer?.id],
    queryFn: () => storedValueApi.storeCredit(pos.customer!.id),
    enabled: online && !!pos.customer && dialog === 'payment',
  });

  const saleInput = (forOffline = false): Omit<CreateSaleInput, 'payments'> => ({
    registerId: register!.id,
    customerId: pos.customer?.id,
    salespersonId: pos.salespersonId ?? undefined,
    discountCode: pos.discount?.code,
    cartDiscount: pos.cartDiscount ?? undefined,
    notes: pos.notes || undefined,
    heldSaleId: forOffline ? undefined : (pos.heldSaleId ?? undefined),
    estimateId: forOffline ? undefined : (pos.estimate?.id ?? undefined),
    items: cart.map((line) => ({
      variantId: line.variantId,
      quantity: line.quantity,
      discountPercent: line.discountPercent || undefined,
      // Offline: the price charged. Online: only a price override (or an estimate's quoted price) is sent
      unitPrice: forOffline || isPriceOverridden(line) || pos.estimate ? line.unitPrice : undefined,
      discountReason: (line.discountPercent > 0 && line.discountReason?.trim()) || undefined,
      note: line.note?.trim() || undefined,
    })),
    giftCards: forOffline || giftCards.length === 0 ? undefined : giftCards,
    // Offline the server keeps the group discount the till gave (online the group decides)
    groupDiscountPercent: forOffline && groupPercent > 0 ? groupPercent : undefined,
  });

  // Informed confirmation of new prices (AC05), recorded on the sale
  const repricingInput = (): Pick<CreateSaleInput, 'repricedConfirmedAt' | 'repricedPreviousTotal'> =>
    pos.repricing
      ? { repricedConfirmedAt: pos.repricing.confirmedAt, repricedPreviousTotal: pos.repricing.previousTotal }
      : {};

  // continuing: right after the cashier confirmed new prices (keeps the manager approvals)
  const startCheckout = async (options: { continuing?: boolean } = {}) => {
    if (!register || !hasLines || dialog || repricing) return;
    setCheckoutError(null);
    if (giftCards.length > 0 && !online) {
      setNotice(t('Gift cards can only be sold online. Remove them to sell offline.'));
      return;
    }

    // Discounts above the store limit need a written reason (asked before any approval)
    const unexplained = cart.find((l) => l.discountPercent > maxDiscount && !l.discountReason?.trim());
    if (unexplained) {
      setNotice(t('Give a reason for the discount on {product}.', { product: unexplained.productName }));
      return;
    }
    if (
      pos.cartDiscount?.type === 'percentage' &&
      pos.cartDiscount.value > maxDiscount &&
      !pos.cartDiscount.reason?.trim()
    ) {
      setNotice(t('Give a reason for the discount on the sale (Discounts, F8).'));
      return;
    }
    // Offline the cached stock is all the till knows: refuse to sell past it (D018)
    if (!online) {
      const short = stockShortfalls(cart);
      if (short.length > 0) {
        const line = cart.find((l) => l.variantId === short[0].variantId);
        setNotice(
          t('Only {count} × {product} in stock on this till (offline). Sell more once back online.', {
            count: short[0].limit,
            product: line?.productName ?? '',
          })
        );
        return;
      }
    }

    idempotencyKey.current = randomId();
    if (!options.continuing) approvalTokens.current = [];
    let due = grandTotal;
    // Resumed held cart, loaded estimate or cart priced a while ago: stock and items
    // no longer sold are checked too, and offline the cached catalog is compared
    const stale = isStaleCart(pos);

    if (!online && cart.some(isPriceOverridden) && !canOverridePrice) {
      setNotice(t("Price changes need a manager's approval, which needs a connection."));
      return;
    }
    // Confirm prices with the server (and get approvals): a change is shown and
    // confirmed, never applied silently (spec §5). Offline, a stale cart is compared
    // with the cached catalog; a fresh one keeps its local totals.
    if (online || stale) {
      const check: RepriceContext = { trigger: 'checkout', stock: stale ? 'catalog' : null };
      try {
        const { result, quote } = await checkCart(
          (input) =>
            approvals.run((headers) => salesApi.quote(input, headers), {
              tokens: approvalTokens.current,
              onTokens: (tokens) => (approvalTokens.current = tokens),
            }),
          check
        );
        if (result.changed) {
          setRepricing({ result, context: check });
          return;
        }
        applyQuotedGroup();
        pos.markPriced();
        if (quote) due = quote.total;
      } catch (error) {
        if (!isNetworkError(error)) {
          setNotice(getErrorMessage(error, 'Could not price the sale'));
          focusSearch();
          return;
        }
      }
    }

    // Nothing to pay: completes without payment when the store allows it
    if (due <= 0) {
      if (!context?.settings.allowZeroValueSales) {
        setNotice(t('This store does not allow sales with a total of 0.00.'));
        return;
      }
      if (!online && !canOverrideDiscount) {
        setNotice(t("A sale with a total of 0.00 needs a manager's approval, which needs a connection."));
        return;
      }
      await completeSale([]);
      return;
    }
    setAmountDue(due);
    setDialog('payment');
  };

  const finishSale = (sale: Sale, offline: boolean) => {
    setCompleted({ sale, offline });
    setDialogState(null);
    pos.clearCart();
    setGiftCards([]);
    setIssuedCards(sale.issuedGiftCards ?? []);
    setSelectedKey(null);
    setNotice(null);
    setMobileView('products');
    // Stock levels changed
    queryClient.invalidateQueries({ queryKey: ['pos', 'search'] });
    if (!offline) queryClient.invalidateQueries({ queryKey: ['pos', 'catalog-cache'] });
  };

  const completeSale = async (payments: TenderedPayment[], changeCurrency?: string) => {
    if (!register) return;
    setSubmitting(true);
    setCheckoutError(null);
    const input: CreateSaleInput = {
      ...saleInput(),
      ...repricingInput(),
      payments,
      changeCurrency,
      idempotencyKey: idempotencyKey.current!,
    };

    try {
      let sale: Sale;
      let offline = false;
      try {
        if (!online) throw new OfflineError();
        sale = await approvals.run((headers) => salesApi.create(input, headers), {
          tokens: approvalTokens.current,
        });
      } catch (error) {
        if (!(error instanceof OfflineError) && !isNetworkError(error)) throw error;
        sale = await saveOffline(input, payments);
        offline = true;
      }
      if (sale.status === 'payment_pending') {
        // Card terminal: wait for the provider to capture the payment
        setDialogState(null);
        setAwaitingPayment(sale);
        return;
      }
      finishSale(sale, offline);
    } catch (error) {
      // Offline selling not allowed on this till (no or expired lease)
      const message =
        error instanceof OfflineLeaseError ? error.message : getErrorMessage(error, 'The sale could not be completed');
      setCheckoutError(message);
      // A zero-value sale has no payment dialog to show the error in
      if (payments.length === 0) setNotice(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Store the sale on the device with the prices charged, and build a provisional receipt
  const saveOffline = async (input: CreateSaleInput, payments: TenderedPayment[]): Promise<Sale> => {
    const capturedAt = new Date().toISOString();
    const salesperson = staff.find((m) => m.id === pos.salespersonId) ?? null;
    const offlineNumber = `OFFLINE-${input.idempotencyKey!.slice(0, 8).toUpperCase()}`;
    const offlineInput: CreateSaleInput = {
      ...saleInput(true),
      ...repricingInput(),
      payments,
      changeCurrency: input.changeCurrency,
      idempotencyKey: input.idempotencyKey,
      offlineCapturedAt: capturedAt,
      // Printed on the provisional receipt; stored on the sale when it syncs
      offlineNumber,
    };
    // One IndexedDB transaction; if it fails the sale is not complete and the cart stays
    await pendingSales.add({
      id: input.idempotencyKey!,
      input: offlineInput,
      createdAt: capturedAt,
      total: totals.total,
      attempts: 0,
      actorId: user?.id ?? null,
      // Prices, tax and policies this sale was rung up with (kept for review)
      snapshot: {
        currencyCode: currency,
        taxRate: tax.taxRate,
        pricesIncludeTax: tax.pricesIncludeTax,
        maxDiscountPercent: context?.settings.maxDiscountPercent ?? null,
        exchangeRates: context?.settings.exchangeRates ?? {},
        exchangeBuyRates: context?.settings.exchangeBuyRates ?? {},
        settingsVersion: (context?.settings as { version?: number } | undefined)?.version ?? null,
        discount: pos.discount ? { code: pos.discount.code } : null,
        cartDiscount: pos.cartDiscount ? { type: pos.cartDiscount.type, value: pos.cartDiscount.value } : null,
        lines: totals.lines.map((line) => {
          const cartLine = cart.find((l) => l.key === line.key);
          return {
            variantId: cartLine?.variantId ?? line.key,
            unitPrice: line.unitPrice,
            catalogPrice: cartLine?.catalogPrice ?? null,
            discountPercent: cartLine?.discountPercent ?? 0,
            taxRate: line.taxRate ?? null,
          };
        }),
      },
    });
    await pending.refresh();

    const paid = payments.reduce((sum, p) => sum + p.amount, 0);
    const change = Math.max(0, Math.round((paid - totals.total) * 100) / 100);
    const methods = new Map((context?.paymentMethods ?? []).map((m) => [m.id, m]));
    const exact = payments.reduce(
      (sum, p) => sum + (p.tenderedAmount && p.exchangeRate ? toSaleCurrency(p.tenderedAmount, p.exchangeRate) : p.amount),
      0
    );
    const storeCurrency = context?.settings.currencyCode ?? currency;
    const sellRate = input.changeCurrency
      ? exchangeRate(context?.settings.exchangeRates, storeCurrency, currency, input.changeCurrency)
      : null;
    const buyRate = input.changeCurrency
      ? exchangeRate(
          buyRatesOf(context?.settings.exchangeRates, context?.settings.exchangeBuyRates),
          storeCurrency,
          currency,
          input.changeCurrency
        )
      : null;
    // Cash paid in the change currency goes back at the rate it came in (as the server does)
    const paidInChangeCurrency = payments
      .filter(
        (p) =>
          p.currencyCode === input.changeCurrency &&
          p.tenderedAmount &&
          p.exchangeRate &&
          methods.get(p.paymentMethodId)?.methodType === 'cash'
      )
      .reduce((sum, p) => sum + toSaleCurrency(p.tenderedAmount!, p.exchangeRate!), 0);
    return {
      id: input.idempotencyKey!,
      saleNumber: offlineNumber,
      offlineNumber: null,
      branchId: register!.branchId,
      registerId: register!.id,
      customerId: pos.customer?.id ?? null,
      userId: user?.id ?? '',
      saleDate: capturedAt,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      amountPaid: paid,
      changeAmount: change,
      currencyCode: currency,
      notes: 'Recorded offline',
      salespersonId: pos.salespersonId,
      salesperson: salesperson ? { id: salesperson.id, firstName: salesperson.name, lastName: null, email: '' } : null,
      metadata: {
        cartDiscountReason: pos.cartDiscount?.reason?.trim() || null,
        groupDiscount: totals.groupDiscountAmount
          ? {
              groupId: pos.customer?.group?.id ?? null,
              name: pos.customer?.group?.name ?? null,
              percent: groupPercent,
              amount: totals.groupDiscountAmount,
            }
          : null,
        changeTender:
          change > 0 && input.changeCurrency && sellRate && buyRate
            ? {
                currencyCode: input.changeCurrency,
                amount: foreignChange(Math.max(0, exact - totals.total), paidInChangeCurrency, sellRate, buyRate),
                exchangeRate: buyRate,
                sellRate,
              }
            : null,
      },
      status: 'completed',
      items: totals.lines.map((line, index) => {
        const cartLine = cart.find((l) => l.key === line.key)!;
        return {
          id: line.key,
          variantId: cartLine.variantId,
          sku: cartLine.sku,
          productName: cartLine.productName,
          variantName: cartLine.variantName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          originalUnitPrice: isPriceOverridden(cartLine) ? cartLine.catalogPrice : null,
          subtotal: line.subtotal,
          discountAmount: line.discountAmount,
          taxRate: line.taxRate ?? tax.taxRate,
          taxAmount: line.taxAmount,
          total: line.total,
          lineNumber: index + 1,
          notes: cartLine.note?.trim() || null,
          metadata:
            (cartLine.discountPercent > 0 && cartLine.discountReason?.trim()) || isMeasured(cartLine.unit)
              ? {
                  ...(cartLine.discountPercent > 0 && cartLine.discountReason?.trim()
                    ? { discountReason: cartLine.discountReason.trim() }
                    : {}),
                  // Measured item: printed as "1.250 kg × 3.99/kg"
                  ...(isMeasured(cartLine.unit)
                    ? { unit: cartLine.unit?.code ?? undefined, unitPrecision: cartLine.unit?.precision }
                    : {}),
                }
              : null,
        };
      }),
      payments: payments.map((p, index) => ({
        id: String(index),
        paymentMethodId: p.paymentMethodId,
        amount: p.amount,
        reference: p.reference ?? null,
        tenderedCurrency: p.currencyCode ?? null,
        tenderedAmount: p.tenderedAmount ?? null,
        exchangeRate: p.exchangeRate ?? null,
        status: 'pending',
        paymentMethod: methods.get(p.paymentMethodId),
      })),
      register: register!,
      branch: register!.branch,
      user: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } : undefined,
    };
  };

  // ---- Held carts (R042) ----
  const [holding, setHolding] = useState(false);
  const holdCart = async () => {
    if (!register || cart.length === 0 || holding || dialog) return;
    if (giftCards.length > 0) {
      setNotice(t('Gift cards are sold at checkout and cannot be held.'));
      return;
    }
    if (!canHold) {
      setNotice(t('You are not allowed to hold carts.'));
      return;
    }
    if (!online) {
      setNotice(t('Holding a cart needs a connection (held carts are kept on the server).'));
      return;
    }
    setHolding(true);
    try {
      const held = await salesApi.hold({
        ...saleInput(),
        heldSaleId: pos.heldSaleId ?? undefined,
        label: pos.customer?.name,
      });
      pos.clearCart();
      setSelectedKey(null);
      setNotice(t('Cart held as {number}. Resume it from Held carts (F9).', { number: held.saleNumber }));
      queryClient.invalidateQueries({ queryKey: ['pos', 'held'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'search'] });
    } catch (error) {
      setNotice(getErrorMessage(error, 'Could not hold the cart'));
    } finally {
      setHolding(false);
      focusSearch();
    }
  };

  const resumeCart = async (heldSale: Sale) => {
    if (
      cart.length > 0 &&
      !window.confirm(t('Replace the current cart with the held cart? Hold the current cart first to keep it.'))
    ) {
      return;
    }
    const { sale, cart: resumed } = await salesApi.resume(heldSale.id);
    let discount = null;
    if (resumed.discountCode) {
      discount = await discountsApi.lookup(resumed.discountCode).catch(() => null);
      if (!discount) {
        setNotice(t('Discount code {code} is no longer valid and was removed.', { code: resumed.discountCode }));
      }
    }
    pos.loadCart(resumed, {
      customer: sale.customer
        ? { id: sale.customer.id, name: customerName(sale.customer), loyaltyPoints: sale.customer.loyaltyPoints ?? 0 }
        : null,
      discount,
    });
    setSelectedKey(null);
    setDialog(null);
    queryClient.invalidateQueries({ queryKey: ['pos', 'held'] });

    // AC05: reprice the held cart now and show what changed since it was held
    const check: RepriceContext = {
      trigger: 'resume',
      stock: 'cart',
      heldTotal: Number(sale.total),
      discountCodeLost: resumed.discountCode && !discount ? resumed.discountCode : null,
    };
    try {
      const { result } = await checkCart((input) => salesApi.quote(input), check);
      if (result.changed) setRepricing({ result, context: check });
      else {
        applyQuotedGroup();
        pos.markPriced();
      }
    } catch {
      // Needs a manager's approval, or the server could not price it: checked again at checkout
    }
  };

  // ---- Repricing (spec §5, AC05) ----
  const [repricing, setRepricing] = useState<{ result: Revalidation<Discount>; context: RepriceContext } | null>(
    null
  );
  const [repricingBusy, setRepricingBusy] = useState(false);
  // Bumped to go on to the payment once new prices were confirmed at checkout
  const [checkoutRequest, setCheckoutRequest] = useState(0);

  /**
   * Compare the cart with what the store sells now: the server's quote online (items no
   * longer sold are found in the refreshed catalog and left out of it), the cached
   * catalog offline or when the server cannot be reached. Throws the quote's error
   * when it is not about an item that is no longer sold.
   */
  const checkCart = async (
    runQuote: (input: QuoteInput) => Promise<Quote>,
    context: RepriceContext
  ): Promise<{ result: Revalidation<Discount>; quote: Quote | null }> => {
    const state = usePOSStore.getState();
    const lines = state.cart;
    let catalogItems: CatalogItem[] = catalog.items ?? [];
    const refreshCatalog = async () => {
      if (online) {
        const { data } = await catalog.refreshCache().catch(() => ({ data: undefined }));
        if (data) catalogItems = data.items;
      }
      return catalogItems;
    };
    if (context.stock === 'catalog') await refreshCatalog();

    // The held cart's own reservation counts as available to it
    const reservedOf = (variantId: string) =>
      state.heldSaleId
        ? lines.filter((l) => l.variantId === variantId).reduce((sum, l) => addQty(sum, l.reserved ?? 0), 0)
        : 0;
    const availableOf = (line: (typeof lines)[number], stockMode: RepriceContext['stock']): number | null => {
      if (line.stockTracked === false || !stockMode) return null;
      if (stockMode === 'cart') return line.stock;
      const item = catalogItems.find((i) => i.variantId === line.variantId);
      if (!item || item.stockTracked === false || item.stock === null) return null;
      return addQty(item.stock, reservedOf(line.variantId));
    };
    // The group discount the server priced with (undefined: unknown, kept as it is)
    let currentGroupDiscountPercent: number | undefined;
    const compare = (
      current: Map<string, CurrentLine>,
      currentDiscount: Discount | null | undefined,
      quote: QuotedTotals | null
    ) =>
      revalidateCart<Discount>({
        lines,
        discount: state.discount,
        cartDiscount: state.cartDiscount,
        tax,
        current,
        currentDiscount,
        discountCodeLost: context.discountCodeLost,
        heldTotal: context.heldTotal,
        quote,
        groupDiscountPercent: groupDiscountPercentOf(state),
        currentGroupDiscountPercent,
      });

    // ---- Offline: the cached catalog ----
    const cachedCheck = () => {
      const byId = new Map(catalogItems.map((i) => [i.variantId, i]));
      const current = new Map<string, CurrentLine>();
      for (const line of lines) {
        const item = byId.get(line.variantId);
        // No cached catalog at all: nothing to compare with
        if (!item && catalogItems.length === 0) continue;
        current.set(
          line.key,
          item
            ? {
                // An estimate sells at its quoted prices
                price: state.estimate ? catalogPriceOf(line) : item.price,
                taxRate: item.taxRate,
                available: availableOf(line, context.stock === 'cart' ? 'cart' : 'catalog'),
              }
            : { price: null }
        );
      }
      // A code past its end date no longer applies (the rest is checked online)
      const expired = !!state.discount?.validTo && Date.parse(state.discount.validTo) < Date.now();
      return { result: compare(current, expired ? null : undefined, null), quote: null };
    };

    if (!online) return cachedCheck();
    try {
      // The discount code as it is now (null: no longer valid)
      let currentDiscount: Discount | null | undefined;
      if (state.discount) {
        currentDiscount = await discountsApi.lookup(state.discount.code).catch((error) => {
          if (isNetworkError(error)) throw error;
          return null;
        });
      }
      const discount = currentDiscount === undefined ? state.discount : currentDiscount;
      let unsellable = new Set<string>();
      const kept = () => lines.filter((l) => !unsellable.has(l.key));
      const quoteCart = () =>
        kept().length === 0 && giftCards.length === 0
          ? Promise.resolve(null)
          : runQuote({
              registerId: register!.id,
              estimateId: state.estimate?.id,
              customerId: state.customer?.id,
              discountCode: discount?.code,
              cartDiscount: state.cartDiscount ?? undefined,
              items: kept().map((line) => ({
                variantId: line.variantId,
                quantity: line.quantity,
                discountPercent: line.discountPercent || undefined,
                unitPrice: isPriceOverridden(line) || state.estimate ? line.unitPrice : undefined,
                discountReason: (line.discountPercent > 0 && line.discountReason?.trim()) || undefined,
              })),
              giftCards: giftCards.length === 0 ? undefined : giftCards,
            });
      let quote: Quote | null;
      try {
        quote = await quoteCart();
      } catch (error) {
        if (isNetworkError(error) || approvablePermission(error)) throw error;
        // An item may no longer be sold: the catalog lists every item still for sale
        const items = await refreshCatalog();
        const sold = new Set(items.map((i) => i.variantId));
        unsellable = new Set(items.length ? lines.filter((l) => !sold.has(l.variantId)).map((l) => l.key) : []);
        if (unsellable.size === 0) throw error;
        quote = await quoteCart();
      }

      if (quote && quote.customerGroup !== undefined) {
        quotedGroup.current = quote.customerGroup;
        currentGroupDiscountPercent = state.estimate ? 0 : (quote.customerGroup?.discountPercent ?? 0);
      }
      const current = new Map<string, CurrentLine>();
      const quoted: QuotedTotals | null = quote ? { total: round2(quote.total - giftTotal), lines: new Map() } : null;
      kept().forEach((line, index) => {
        const serverLine = quote?.lines[index];
        if (!serverLine) return;
        current.set(line.key, {
          price: serverLine.catalogPrice ?? serverLine.unitPrice,
          taxRate: serverLine.taxRate,
          available: availableOf(line, context.stock),
        });
        quoted!.lines.set(line.key, { unitPrice: serverLine.unitPrice, taxRate: serverLine.taxRate, total: serverLine.total });
      });
      for (const key of unsellable) current.set(key, { price: null });
      return { result: compare(current, currentDiscount, quoted), quote };
    } catch (error) {
      // The server cannot be reached: compare with the cached catalog
      if (isNetworkError(error)) return cachedCheck();
      throw error;
    }
  };

  // A line was removed / reduced in the repricing dialog: check the cart again
  const recheckRepricing = async () => {
    if (!repricing) return;
    // The held total no longer matches the cart once a line changed
    const context: RepriceContext = { ...repricing.context, heldTotal: null };
    setRepricingBusy(true);
    try {
      const { result } = await checkCart(
        (input) =>
          repricing.context.trigger === 'checkout'
            ? approvals.run((headers) => salesApi.quote(input, headers), {
                tokens: approvalTokens.current,
                onTokens: (tokens) => (approvalTokens.current = tokens),
              })
            : salesApi.quote(input),
        context
      );
      if (usePOSStore.getState().cart.length === 0 || !result.changed) {
        setRepricing(null);
        applyQuotedGroup();
        pos.markPriced();
        if (repricing.context.trigger === 'checkout' && usePOSStore.getState().cart.length > 0) {
          setCheckoutRequest((n) => n + 1);
        } else {
          focusSearch();
        }
      } else {
        setRepricing({ result, context });
      }
    } catch (error) {
      setRepricing(null);
      setNotice(getErrorMessage(error, 'Could not price the sale'));
    } finally {
      setRepricingBusy(false);
    }
  };

  const confirmRepricing = () => {
    if (!repricing || repricing.result.blocking) return;
    const { result, context } = repricing;
    applyQuotedGroup();
    pos.applyRepricing(result.apply, { confirmedAt: new Date().toISOString(), previousTotal: result.totalBefore });
    setRepricing(null);
    setNotice(
      t('New prices applied: {before} → {after}.', { before: money(result.totalBefore), after: money(result.totalAfter) })
    );
    if (context.trigger === 'checkout') setCheckoutRequest((n) => n + 1);
    else focusSearch();
  };

  const cancelRepricing = () => {
    setRepricing(null);
    // Not confirmed: the cart keeps its prices and is checked again before tendering
    focusSearch();
  };

  // New prices confirmed at checkout: go on to the payment with the updated cart
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once per confirmation, with the repriced cart
    if (checkoutRequest > 0) void startCheckout({ continuing: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutRequest]);

  const clearCart = async () => {
    if (cart.length === 0) return;
    const resumed = pos.heldSaleId;
    const message = resumed
      ? t('Clear the cart? The resumed held cart is cancelled and its items go back on sale.')
      : t('Clear the cart?');
    if (!window.confirm(message)) return;
    if (resumed && online) {
      await salesApi.cancel(resumed, 'Cleared at the till').catch(() => undefined);
    }
    pos.clearCart();
    setSelectedKey(null);
    focusSearch();
  };

  // ---- Keyboard (R048) ----
  const noDialog = !dialog && !completed && !awaitingPayment && !priceKey && !quantityTarget && !repricing;
  usePosShortcuts(
    {
      search: () => searchRef.current?.focus(),
      customer: () => setDialog('customer'),
      hold: holdCart,
      discount: () => {
        if (cart.length > 0) setDialog('discount');
      },
      heldCarts: () => setDialog('held'),
      charge: () => startCheckout(),
      help: () => setDialog('shortcuts'),
      // Measured lines: +/- open the quantity pad (a weight is typed, not counted)
      increase: () => {
        if (selected && isMeasured(selected.unit)) setQuantityTarget({ key: selected.key });
        else if (selected) changeQuantity(selected.key, selected.quantity + 1);
      },
      decrease: () => {
        if (selected && isMeasured(selected.unit)) setQuantityTarget({ key: selected.key });
        else if (selected) pos.setQuantity(selected.key, selected.quantity - 1);
      },
      remove: () => {
        if (selected) pos.removeItem(selected.key);
      },
      selectNext: () => moveSelection(1),
      selectPrevious: () => moveSelection(-1),
    },
    noDialog
  );

  // Help (F1 / Help button) opens on the topic of what is on screen
  useHelpContext(
    completed
      ? 'pos-receipt'
      : awaitingPayment
        ? 'pos-payment-card'
        : repricing
          ? 'pos-held-carts'
          : priceKey
            ? 'pos-price-change'
            : quantityTarget
              ? 'pos-weighed-items'
              : dialog
                ? POS_DIALOG_TOPICS[dialog]
                : null
  );

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const canManage = canUseAdmin(user);
  const failedCount = pending.sales.filter((s) => s.error).length;
  const priceLine = cart.find((l) => l.key === priceKey) ?? null;

  // ---- Setup states ----
  if (contextLoading) {
    return <FullScreenMessage>{t('Loading the register...')}</FullScreenMessage>;
  }
  if (contextError || !context) {
    return (
      <FullScreenMessage>
        {getErrorMessage(contextError, 'Could not load the POS. Check your connection.')}
      </FullScreenMessage>
    );
  }
  if (registers.length === 0 || context.paymentMethods.length === 0) {
    return (
      <FullScreenMessage>
        <p className="mb-4">
          {t("This store isn't set up for selling yet: it needs a register and at least one payment method.")}
        </p>
        {canManage ? (
          <Button asChild>
            <Link href="/admin/settings">{t('Open store settings')}</Link>
          </Button>
        ) : (
          <p className="text-sm text-gray-500">{t('Ask a manager to finish the store setup.')}</p>
        )}
      </FullScreenMessage>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100 max-md:h-dvh">
      {/* Offline lease: notice while offline, lock once it has expired */}
      <OfflineLeaseGuard online={online} registerId={register?.id ?? null} />
      {/* Top bar. Phones: two rows (store + status, then register + shift); the
          secondary actions move to the "more" menu */}
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b bg-white px-3 py-2 md:flex-nowrap md:gap-3 md:px-4">
        <ShoppingCart className="h-5 w-5 shrink-0 text-blue-600" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-semibold md:min-w-auto md:flex-none md:overflow-visible md:whitespace-normal">
          {context.settings.storeName}
        </span>
        <div className="order-last flex w-full min-w-0 items-center gap-2 md:order-none md:contents">
          <Select
            value={register?.id ?? ''}
            onChange={(e) => setRegister(e.target.value)}
            className="h-9 min-w-0 flex-1 md:w-48 md:min-w-auto md:flex-none"
            aria-label={t('Register')}
          >
            {registers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.branch?.name}
              </option>
            ))}
          </Select>
          <ShiftPanel
            registerId={register?.id}
            registerName={register?.name}
            currency={context.settings.currencyCode}
            storeName={context.settings.storeName}
          />
        </div>
        <div className="hidden md:contents">
          <DrawerOpenButton registerId={register?.id} />
          <ClockButton branchId={register?.branchId} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
          <button
            onClick={() => setDialog('pending')}
            className={cn(
              'flex h-9 items-center gap-1 rounded-full px-3 text-xs font-medium',
              online ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800',
              failedCount > 0 && 'bg-red-50 text-red-700'
            )}
            title={t('Connection and offline sales')}
            aria-label={`${online ? t('Online') : t('Offline')}${
              pending.sales.length
                ? `, ${plural(pending.sales.length, '{count} sale waiting to upload', '{count} sales waiting to upload')}`
                : ''
            }`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="max-md:sr-only">{online ? t('Online') : t('Offline')}</span>
            {pending.sales.length > 0 && (
              <span className="ml-1 flex items-center gap-1">
                <CloudUpload className="h-3.5 w-3.5" />
                <span className="max-md:hidden">{t('{count} pending', { count: pending.sales.length })}</span>
                <span className="md:hidden">{pending.sales.length}</span>
              </span>
            )}
          </button>
          {context.fromCache && <span className="text-xs text-amber-700 max-md:hidden">{t('Using saved data')}</span>}
          {canHold && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 max-md:hidden"
              onClick={() => setDialog('held')}
              title={t('Held carts (F9)')}
            >
              <ListRestart className="h-4 w-4" />
              {t('Held carts')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="max-md:hidden"
            onClick={() => setDialog('shortcuts')}
            title={t('Keyboard shortcuts (?)')}
            aria-label={t('Keyboard shortcuts')}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <HelpButton className="max-md:hidden" />
          {hasPermission(user, 'sales.refund') && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 max-md:hidden"
              onClick={() => setDialog('returns')}
              disabled={!online}
              title={online ? t('Returns and exchanges') : t('Returns need a connection')}
            >
              <RotateCcw className="h-4 w-4" />
              {t('Returns')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" className="h-9 max-md:hidden" asChild>
              <Link href="/admin">
                <Settings className="h-4 w-4" />
                {t('Admin')}
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:hidden"
            onClick={() => setDialog('menu')}
            aria-label={t('More actions')}
            aria-haspopup="dialog"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          <NotificationBell />
          <LanguageSwitcher compact className="max-md:hidden" />
          <Button variant="ghost" size="icon" className="max-md:hidden" asChild title={t('Account security')}>
            <Link href="/account/security" aria-label={t('Account security')}>
              <ShieldCheck className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="max-md:hidden"
            onClick={handleLogout}
            title={t('Sign out')}
            aria-label={t('Sign out')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Phones: products and cart as two views */}
      <div className="grid grid-cols-2 gap-1 border-b bg-white p-1.5 md:hidden" role="tablist" aria-label={t('Till views')}>
        <MobileTab active={mobileView === 'products'} onClick={() => setMobileView('products')}>
          {t('Products')}
        </MobileTab>
        <MobileTab active={mobileView === 'cart'} onClick={() => setMobileView('cart')}>
          {t('Cart ({count})', { count: itemCount })}
          {giftCards.length > 0 ? ` + ${giftCards.length}` : ''}
        </MobileTab>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Products */}
        <section
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-3 p-4 max-md:gap-2 max-md:p-3',
            mobileView === 'cart' && 'max-md:hidden'
          )}
          aria-label={t('Products')}
        >
          <form
            className="relative"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchEnter();
            }}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input
              ref={searchRef}
              autoFocus={!smallScreen}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={scanner.onKeyDown}
              enterKeyHint="search"
              placeholder={
                smallScreen ? t('Search or scan a barcode...') : t('Search products or scan a barcode... (F2)')
              }
              aria-label={t('Search products or scan a barcode')}
              className="h-12 bg-white pl-10 text-base"
            />
          </form>

          {context.categories.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto pb-1 max-md:-mx-3 max-md:shrink-0 max-md:snap-x max-md:px-3 max-md:[scrollbar-width:none]"
              role="group"
              aria-label={t('Categories')}
            >
              <CategoryChip active={!categoryId} onClick={() => setCategoryId(null)}>
                {t('All')}
              </CategoryChip>
              {context.categories.map((category) => (
                <CategoryChip
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  {text(category.name, category.code)}
                </CategoryChip>
              ))}
            </div>
          )}

          {notice && (
            <div
              className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
              role="status"
            >
              {notice}
              <button onClick={() => setNotice(null)} className="min-h-9 px-2 text-xs underline">
                {t('Dismiss')}
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {results.length === 0 ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                {searching
                  ? t('Searching...')
                  : debouncedSearch
                    ? t('No products match your search')
                    : t('No products yet')}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-md:gap-2 md:grid-cols-3 xl:grid-cols-4">
                {results.map((item) => {
                  // Stock never goes negative (D018); services are never sold out
                  const soldOut = item.stockTracked !== false && item.stock !== null && item.stock <= 0;
                  return (
                    <button
                      key={item.variantId}
                      onClick={() => addToCart(item)}
                      disabled={soldOut}
                      aria-label={t('Add {product}, {price}', {
                        product: `${item.productName}${item.variantName ? ` ${item.variantName}` : ''}`,
                        price: money(item.price),
                      })}
                      className="flex min-h-28 flex-col rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:shadow focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 max-md:min-h-32 max-md:min-w-0 max-md:active:scale-[0.98]"
                    >
                      <span className="line-clamp-2 font-medium max-md:break-words">{item.productName}</span>
                      {item.variantName && <span className="text-sm text-gray-500">{item.variantName}</span>}
                      <span className="mt-1 font-mono text-xs text-gray-400 max-md:truncate">{item.sku}</span>
                      <span className="mt-auto flex items-end justify-between pt-2 max-md:flex-wrap max-md:gap-x-2">
                        <span className="text-lg font-semibold">{money(item.price)}</span>
                        {item.stock !== null && (
                          <span className={cn('text-xs', item.stock <= 0 ? 'text-red-600' : 'text-gray-500')}>
                            {soldOut ? t('Out of stock') : t('{count} in stock', { count: item.stock })}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Cart */}
        {/* Phones: the whole cart scrolls, the totals and Charge stay at the bottom */}
        <aside
          className={cn(
            'flex w-[26rem] shrink-0 flex-col border-l bg-white max-md:w-full max-md:overflow-y-auto max-md:border-l-0',
            mobileView === 'products' && 'max-md:hidden'
          )}
          aria-label={t('Cart')}
        >
          <div className="border-b p-3">
            <Button
              variant="outline"
              className="h-11 w-full justify-start"
              onClick={() => setDialog('customer')}
              title={t('Customer (F4)')}
            >
              <User className="h-4 w-4" />
              {pos.customer ? (
                <span>
                  {pos.customer.name} <span className="text-gray-500">· {t('{points} pts', { points: pos.customer.loyaltyPoints })}</span>
                  {pos.customer.group && <span className="text-gray-500"> · {pos.customer.group.name}</span>}
                </span>
              ) : (
                t('Walk-in customer')
              )}
            </Button>
            <SalespersonSelect value={pos.salespersonId} onChange={pos.setSalesperson} />
            {pos.heldSaleId && (
              <p className="mt-2 text-xs text-blue-700">{t('Resumed held cart — completing it closes the hold.')}</p>
            )}
            {pos.estimate && (
              <p className="mt-2 text-xs text-blue-700">
                {t('Estimate {number} — sold at the quoted prices; completing the sale converts it.', {
                  number: pos.estimate.number,
                })}
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3 max-md:flex-none max-md:overflow-visible">
            {issuedCards.length > 0 && (
              <div className="mb-3 rounded-lg border-2 border-green-600 bg-green-50 p-3 text-sm" role="status">
                <p className="font-semibold text-green-900">{t('Gift cards issued — give the codes to the customer')}</p>
                <ul className="mt-1 space-y-1">
                  {issuedCards.map((card) => (
                    <li key={card.accountId} className="flex justify-between font-mono">
                      <span>{card.code}</span>
                      <span>{money(card.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-green-800">{t('The full code is shown only now.')}</p>
                <button onClick={() => setIssuedCards([])} className="mt-1 min-h-8 text-xs underline">
                  {t('Dismiss')}
                </button>
              </div>
            )}
            {cart.length === 0 && giftCards.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 max-md:py-10">
                <ShoppingCart className="mb-2 h-12 w-12" aria-hidden />
                <p>{t('Cart is empty')}</p>
                <Button variant="outline" className="mt-4 h-11 md:hidden" onClick={() => setMobileView('products')}>
                  {t('Add products')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((line) => {
                  const calc = totals.lines.find((l) => l.key === line.key);
                  const overridden = isPriceOverridden(line);
                  const needsApproval =
                    (overridden && !canOverridePrice) || (line.discountPercent > maxDiscount && !canOverrideDiscount);
                  const isSelected = selected?.key === line.key;
                  const measured = isMeasured(line.unit);
                  const perUnit = measured && line.unit?.code
                    ? t('{price}/{unit}', { price: money(line.unitPrice), unit: line.unit.code })
                    : null;
                  return (
                    <li
                      key={line.key}
                      id={`cart-line-${line.key}`}
                      onClick={() => setSelectedKey(line.key)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={cn('rounded-lg border p-3', isSelected && 'border-blue-500 ring-1 ring-blue-500')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{line.productName}</p>
                          {line.variantName && <p className="text-sm text-gray-500">{line.variantName}</p>}
                          <button
                            type="button"
                            onClick={() => setPriceKey(line.key)}
                            className="flex min-h-8 items-center gap-1 text-xs text-gray-500 hover:text-blue-700 max-md:flex-wrap max-md:text-left"
                            aria-label={t('Change price of {product}, now {price}', { product: line.productName, price: money(line.unitPrice) })}
                          >
                            {measured
                              ? // "1.250 kg × 3.99/kg"
                                `${formatQuantity(line.quantity, line.unit)} × ${perUnit ?? money(line.unitPrice)}`
                              : t('{price} each', { price: money(line.unitPrice) })}
                            {overridden && <span className="text-amber-700 line-through">{money(line.catalogPrice)}</span>}
                            <span>· {line.sku}</span>
                            <Pencil className="h-3 w-3" aria-hidden />
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 shrink-0 max-md:h-11 max-md:w-11"
                          onClick={() => pos.removeItem(line.key)}
                          aria-label={t('Remove {product}', { product: line.productName })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 max-md:flex-wrap">
                        {measured ? (
                          <Button
                            variant="outline"
                            className="h-10 min-w-24 tabular-nums max-md:h-11"
                            onClick={() => {
                              setSelectedKey(line.key);
                              setQuantityTarget({ key: line.key });
                            }}
                            aria-label={t('Change quantity of {product}, now {quantity}', {
                              product: line.productName,
                              quantity: formatQuantity(line.quantity, line.unit),
                            })}
                          >
                            {formatQuantity(line.quantity, line.unit)}
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 max-md:h-11 max-md:w-11"
                              onClick={() => pos.setQuantity(line.key, line.quantity - 1)}
                              aria-label={t('Decrease quantity of {product}', { product: line.productName })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              value={line.quantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!Number.isNaN(value)) changeQuantity(line.key, value);
                              }}
                              onFocus={() => setSelectedKey(line.key)}
                              inputMode="numeric"
                              enterKeyHint="done"
                              className="h-10 w-14 text-center max-md:h-11 max-md:w-12 max-md:px-1 max-md:text-base"
                              aria-label={t('Quantity of {product}', { product: line.productName })}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 max-md:h-11 max-md:w-11"
                              onClick={() => changeQuantity(line.key, line.quantity + 1)}
                              aria-label={t('Increase quantity of {product}', { product: line.productName })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <label className="flex items-center gap-1 text-xs text-gray-500" title={t('Line discount %')}>
                          <Percent className="h-3 w-3" aria-hidden />
                          <Input
                            value={line.discountPercent || ''}
                            onChange={(e) => pos.setLineDiscount(line.key, Number(e.target.value) || 0)}
                            onFocus={() => setSelectedKey(line.key)}
                            inputMode="decimal"
                            enterKeyHint="done"
                            placeholder="0"
                            className="h-10 w-16 text-right max-md:h-11 max-md:w-14 max-md:text-base"
                            aria-label={t('Discount percent on {product}', { product: line.productName })}
                          />
                        </label>
                        <div className="text-right">
                          <p className="font-semibold">{money(calc ? calc.subtotal - calc.discountAmount : 0)}</p>
                          {calc && calc.discountAmount > 0 && (
                            <p className="text-xs text-green-700">-{money(calc.discountAmount)}</p>
                          )}
                        </div>
                      </div>
                      {needsApproval && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                          <AlertTriangle className="h-3 w-3" aria-hidden />
                          {online
                            ? t('Needs a manager’s approval at checkout')
                            : t('Needs a manager’s approval (online only)')}
                        </p>
                      )}
                      {line.discountPercent > maxDiscount && (
                        <Input
                          value={line.discountReason ?? ''}
                          onChange={(e) => pos.setLineDiscountReason(line.key, e.target.value)}
                          onFocus={() => setSelectedKey(line.key)}
                          maxLength={255}
                          placeholder={t('Reason for the discount (required)')}
                          aria-label={t('Reason for the discount on {product}', { product: line.productName })}
                          className="mt-2 h-9 text-sm max-md:h-11 max-md:text-base"
                        />
                      )}
                      {noteKey === line.key ? (
                        <Input
                          autoFocus
                          value={line.note ?? ''}
                          onChange={(e) => pos.setLineNote(line.key, e.target.value)}
                          onBlur={() => setNoteKey(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') setNoteKey(null);
                          }}
                          maxLength={255}
                          placeholder={t('Note printed on the receipt')}
                          aria-label={t('Note on {product}', { product: line.productName })}
                          enterKeyHint="done"
                          className="mt-2 h-9 text-sm max-md:h-11 max-md:text-base"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setNoteKey(line.key)}
                          className={cn(
                            'mt-1 flex min-h-8 items-center gap-1 text-left text-xs hover:text-blue-700 max-md:min-h-10 max-md:break-all',
                            line.note ? 'text-gray-600' : 'text-gray-400'
                          )}
                          aria-label={
                            line.note
                              ? t('Edit the note on {product}', { product: line.productName })
                              : t('Add a note to {product}', { product: line.productName })
                          }
                        >
                          <StickyNote className="h-3 w-3 shrink-0" aria-hidden />
                          {line.note || t('Add a note')}
                        </button>
                      )}
                    </li>
                  );
                })}
                {giftCards.map((card, index) => (
                  <li key={`gift-${index}`} className="flex items-center justify-between rounded-lg border border-dashed p-3">
                    <span>
                      <span className="flex items-center gap-1 font-medium">
                        <Ticket className="h-4 w-4" aria-hidden />
                        {t('Gift card')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {card.code ? card.code : t('Code generated at checkout')} · {t('no tax, no discount')}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold">{money(card.amount)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setGiftCards(giftCards.filter((_, i) => i !== index))}
                        aria-label={t('Remove gift card')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t p-3 max-md:contents">
            <div className="space-y-3 max-md:border-t max-md:p-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setDialog('discount')}
                  disabled={cart.length === 0}
                  title={t('Discounts (F8)')}
                >
                  <Percent className="h-4 w-4" />
                  <span className="truncate">
                    {pos.discount || pos.cartDiscount
                      ? [
                          pos.discount?.code,
                          pos.cartDiscount &&
                            (pos.cartDiscount.type === 'percentage'
                              ? t('{value}% off', { value: pos.cartDiscount.value })
                              : t('{value} off', { value: money(pos.cartDiscount.value) })),
                        ]
                          .filter(Boolean)
                          .join(' + ')
                      : t('Discount')}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={holdCart}
                  disabled={cart.length === 0 || holding || !canHold}
                  title={online ? t('Hold the cart (F6)') : t('Holding a cart needs a connection')}
                >
                  <PauseCircle className="h-4 w-4" />
                  {holding ? t('Holding...') : t('Hold')}
                </Button>
              </div>
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => setDialog('giftcard')}
                title={online ? t('Sell or check a gift card') : t('Gift cards need a connection.')}
              >
                <Ticket className="h-4 w-4" />
                {t('Gift card')}
              </Button>
              {!online && cart.length > 0 && canHold && (
                <p className="text-xs text-gray-500">{t('Offline: holding a cart needs a connection.')}</p>
              )}
              {totals.discountMessage && <p className="text-xs text-amber-700">{totals.discountMessage}</p>}
              <Button
                variant="ghost"
                size="sm"
                className="h-11 w-full md:hidden"
                disabled={cart.length === 0}
                onClick={clearCart}
              >
                {t('Clear cart')}
              </Button>
            </div>

            <div className="space-y-3 max-md:sticky max-md:bottom-0 max-md:mt-auto max-md:border-t max-md:bg-white max-md:p-3 max-md:shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <div className="space-y-1 text-sm">
                <TotalRow label={plural(itemCount, 'Subtotal ({count} item)', 'Subtotal ({count} items)')} value={money(totals.subtotal)} />
                {totals.discountAmount > 0 && (
                  <TotalRow label={t('Discounts')} value={`-${money(totals.discountAmount)}`} className="text-green-700" />
                )}
                {!!totals.groupDiscountAmount && (
                  <TotalRow
                    label={t('Group discount ({name}, {percent}%)', { name: groupName, percent: groupPercent })}
                    value={`-${money(totals.groupDiscountAmount)}`}
                    className="pl-3 text-xs text-green-700"
                  />
                )}
                <TotalRow label={taxLabel} value={money(totals.taxAmount)} />
                {giftTotal > 0 && <TotalRow label={t('Gift cards')} value={money(giftTotal)} />}
                <TotalRow label={t('Total')} value={money(grandTotal)} className="border-t pt-2 text-xl font-bold" />
                {Object.keys(context.settings.exchangeRates ?? {}).map((code) => {
                  const rate = exchangeRate(context.settings.exchangeRates, context.settings.currencyCode, currency, code);
                  return rate && code !== currency ? (
                    <TotalRow key={code} label={t('≈ in {currency}', { currency: code })} value={formatMoney(amountDueIn(grandTotal, rate), code)} className="text-sm text-gray-500" />
                  ) : null;
                })}
              </div>

              <Button
                size="lg"
                className="h-14 w-full text-lg"
                disabled={!hasLines}
                onClick={() => startCheckout()}
                title={t('Charge (F12)')}
              >
                <CreditCard className="h-5 w-5" />
                {t('Charge {amount}', { amount: money(grandTotal) })}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full max-md:hidden"
                disabled={cart.length === 0}
                onClick={clearCart}
              >
                {t('Clear cart')}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Phones, products view: what is in the cart, always in reach */}
      {mobileView === 'products' && (
        <div className="relative border-t bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] md:hidden">
          {added && (
            <p
              key={added.at}
              className="pointer-events-none absolute inset-x-3 -top-12 truncate rounded-lg bg-gray-900/90 px-3 py-2 text-center text-sm text-white shadow-lg"
            >
              {t('Added: {product}', { product: added.product })}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileView('cart')}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left hover:bg-gray-50"
              aria-label={t('View cart: {items}, {total}', {
                items: plural(itemCount, '{count} item', '{count} items'),
                total: money(grandTotal),
              })}
            >
              <span className="relative shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-700" aria-hidden />
                <span
                  ref={badgeRef}
                  className={cn(
                    'absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white',
                    itemCount > 0 ? 'bg-blue-600' : 'bg-gray-400'
                  )}
                  aria-hidden
                >
                  {itemCount}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-gray-500">{plural(itemCount, '{count} item', '{count} items')}</span>
                <span className="block truncate font-semibold tabular-nums">{money(grandTotal)}</span>
              </span>
            </button>
            <Button className="h-12 shrink-0 px-5 text-base" disabled={!hasLines} onClick={() => startCheckout()}>
              <CreditCard className="h-5 w-5" />
              {t('Charge')}
            </Button>
          </div>
        </div>
      )}
      <p className="sr-only md:hidden" role="status" aria-live="polite">
        {added ? t('Added: {product}', { product: added.product }) : ''}
      </p>

      <CustomerDialog
        open={dialog === 'customer'}
        onOpenChange={(open) => setDialog(open ? 'customer' : null)}
        current={pos.customer}
        onSelect={(customer) => void chooseCustomer(customer)}
        online={online}
        registerId={register?.id ?? null}
        paymentMethods={context.paymentMethods}
        currency={currency}
      />
      <GiftCardDialog
        open={dialog === 'giftcard'}
        onOpenChange={(open) => setDialog(open ? 'giftcard' : null)}
        currency={currency}
        online={online}
        onAdd={(card) => setGiftCards((current) => [...current, card])}
      />
      <NewReturnDialog open={dialog === 'returns'} onOpenChange={(open) => setDialog(open ? 'returns' : null)} />
      <DiscountDialog
        open={dialog === 'discount'}
        onOpenChange={(open) => setDialog(open ? 'discount' : null)}
        discount={pos.discount}
        cartDiscount={pos.cartDiscount}
        onApplyCode={pos.setDiscount}
        onApplyCartDiscount={pos.setCartDiscount}
        online={online}
        maxDiscountPercent={maxDiscount}
        discountBase={totals.subtotal}
      />
      <RepricingDialog
        result={repricing?.result ?? null}
        currency={currency}
        heldCart={!!pos.heldSaleId}
        busy={repricingBusy}
        onConfirm={confirmRepricing}
        onCancel={cancelRepricing}
        onRemove={(key) => {
          pos.removeItem(key);
          void recheckRepricing();
        }}
        onReduce={(key, quantity) => {
          pos.setQuantity(key, quantity);
          void recheckRepricing();
        }}
      />
      <PaymentDialog
        open={dialog === 'payment'}
        onOpenChange={(open) => setDialog(open ? 'payment' : null)}
        amountDue={amountDue}
        currency={currency}
        storeCurrency={context.settings.currencyCode}
        exchangeRates={context.settings.exchangeRates ?? {}}
        exchangeBuyRates={context.settings.exchangeBuyRates ?? {}}
        paymentMethods={context.paymentMethods}
        online={online}
        submitting={submitting}
        error={checkoutError}
        onComplete={completeSale}
        customer={pos.customer ? { id: pos.customer.id, name: pos.customer.name } : null}
        storeCreditBalance={storeCredit ? Number(storeCredit.balance) : null}
        loyalty={
          pos.customer && context.settings.loyaltyEnabled
            ? {
                points: pos.customer.loyaltyPoints,
                rules: {
                  enabled: true,
                  earnPercent: Number(context.settings.loyaltyEarnPercent),
                  pointValue: Number(context.settings.loyaltyPointValue),
                  minRedeemPoints: context.settings.loyaltyMinRedeemPoints,
                  maxRedeemPercent: context.settings.loyaltyMaxRedeemPercent,
                },
              }
            : null
        }
      />
      <PendingSalesDialog
        open={dialog === 'pending'}
        onOpenChange={(open) => setDialog(open ? 'pending' : null)}
        sales={pending.sales}
        acknowledged={pending.acknowledged}
        currency={currency}
        online={online}
        syncing={pending.syncing}
        onSync={pending.sync}
      />
      <HeldCartsDialog
        open={dialog === 'held'}
        onOpenChange={(open) => setDialog(open ? 'held' : null)}
        registerId={register?.id ?? null}
        branchId={register?.branchId ?? null}
        currency={currency}
        online={online}
        onResume={resumeCart}
      />
      <ShortcutsDialog open={dialog === 'shortcuts'} onOpenChange={(open) => setDialog(open ? 'shortcuts' : null)} />
      {/* Phones: the header's secondary actions */}
      <Dialog open={dialog === 'menu'} onOpenChange={(open) => setDialog(open ? 'menu' : null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('More actions')}</DialogTitle>
            <DialogDescription className="truncate">
              {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : ''}
              {register ? ` · ${register.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <DrawerOpenButton registerId={register?.id} className={MENU_ITEM} />
            <ClockButton branchId={register?.branchId} className={MENU_ITEM} />
            {canHold && (
              <Button variant="outline" className={MENU_ITEM} onClick={() => setDialog('held')}>
                <ListRestart className="h-4 w-4" />
                {t('Held carts')}
              </Button>
            )}
            {hasPermission(user, 'sales.refund') && (
              <Button variant="outline" className={MENU_ITEM} onClick={() => setDialog('returns')} disabled={!online}>
                <RotateCcw className="h-4 w-4" />
                {online ? t('Returns') : t('Returns need a connection')}
              </Button>
            )}
            {canManage && (
              <Button variant="outline" className={MENU_ITEM} asChild>
                <Link href="/admin">
                  <Settings className="h-4 w-4" />
                  {t('Admin')}
                </Link>
              </Button>
            )}
            {!smallScreen && (
              <Button variant="outline" className={MENU_ITEM} onClick={() => setDialog('shortcuts')}>
                <Keyboard className="h-4 w-4" />
                {t('Keyboard shortcuts')}
              </Button>
            )}
            <HelpButton label variant="outline" className={MENU_ITEM} onOpen={() => setDialog(null)} />
            <Button variant="outline" className={MENU_ITEM} asChild>
              <Link href="/account/security">
                <ShieldCheck className="h-4 w-4" />
                {t('Account security')}
              </Link>
            </Button>
            {context.fromCache && <p className="text-sm text-amber-700">{t('Using saved data')}</p>}
            <LanguageSwitcher className="h-12 rounded-md border px-3" />
            <Button variant="outline" className={cn(MENU_ITEM, 'text-red-700')} onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {t('Sign out')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <QuantityDialog
        target={
          quantityTarget?.item
            ? {
                productName: quantityTarget.item.productName,
                variantName: quantityTarget.item.variantName,
                unit: quantityTarget.item.unit,
                unitPrice: quantityTarget.item.price,
              }
            : quantityLine
              ? {
                  productName: quantityLine.productName,
                  variantName: quantityLine.variantName,
                  unit: quantityLine.unit,
                  unitPrice: quantityLine.unitPrice,
                  quantity: quantityLine.quantity,
                }
              : null
        }
        currency={currency}
        onApply={applyQuantity}
        onClose={() => {
          setQuantityTarget(null);
          focusSearch();
        }}
      />
      <PriceDialog
        line={priceLine}
        currency={currency}
        canOverride={canOverridePrice}
        online={online}
        onApply={pos.setUnitPrice}
        onClose={() => {
          setPriceKey(null);
          focusSearch();
        }}
      />
      <PaymentStatusDialog
        sale={awaitingPayment}
        currency={currency}
        onCompleted={(sale) => {
          setAwaitingPayment(null);
          finishSale(sale, false);
        }}
        onCancelled={() => {
          setAwaitingPayment(null);
          // The cart stays so another payment method can be used; the cancelled sale is gone
          usePOSStore.setState({ heldSaleId: null });
          setNotice(t('Sale cancelled. The cart is still here — take another payment or clear it.'));
          queryClient.invalidateQueries({ queryKey: ['pos', 'search'] });
          focusSearch();
        }}
      />
      <ReceiptDialog
        sale={completed?.sale ?? null}
        settings={context.settings}
        offline={completed?.offline ?? false}
        onClose={() => {
          setCompleted(null);
          focusSearch();
        }}
      />
      {approvals.approvalDialog}
    </div>
  );
}

class OfflineError extends Error {}

// A full-width row of the phone "more actions" menu
const MENU_ITEM = 'h-12 w-full justify-start px-4 text-base';

function MobileTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'min-h-11 truncate rounded-md px-3 text-sm font-medium',
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      {children}
    </button>
  );
}

function CategoryChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-h-10 shrink-0 rounded-full border px-4 text-sm',
        active ? 'border-blue-600 bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
      )}
    >
      {children}
    </button>
  );
}

function TotalRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('flex justify-between', className)}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md rounded-xl border bg-white p-8 text-center shadow">{children}</div>
    </div>
  );
}
