import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CatalogItem, CartDiscountInput, CustomerGroupPricing, ResumedCart } from '@/lib/api/sales';
import type { Discount } from '@/lib/api/discounts';
import { calculateSale, CalcResult } from '@/lib/pos/sale-calculator';
import { isMeasured, roundToUnit, type CatalogUnit } from '@/lib/pos/quantity';
import { randomId } from '@/lib/uuid';

export interface CartItem {
  // Unique per cart line (the same product can be added twice with different discounts)
  key: string;
  variantId: string;
  productId: string;
  categoryId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  // Price charged; differs from catalogPrice after a price override at the till
  unitPrice: number;
  catalogPrice: number;
  quantity: number;
  // Manual line discount, 0–100
  discountPercent: number;
  stock: number | null;
  // False for services / non-stock items: no stock limit (absent on old carts: tracked)
  stockTracked?: boolean;
  // Product tax rate (percent); null/undefined = store default
  taxRate?: number | null;
  // Printed under the line on the receipt
  note?: string;
  // Why the line discount was given (required above the store limit)
  discountReason?: string;
  // Unit of measure; measured items (allowsDecimals) have decimal quantities (1.250 kg)
  unit?: CatalogUnit | null;
  // Units the held cart this line was resumed from keeps reserved (count as available to it)
  reserved?: number;
}

// The cashier saw what changed since the cart was held / priced and confirmed it (AC05)
export interface RepricingConfirmation {
  confirmedAt: string;
  previousTotal: number;
}

// Carts persisted before price overrides existed have no catalogPrice
export const catalogPriceOf = (line: CartItem) => line.catalogPrice ?? line.unitPrice;
export const isPriceOverridden = (line: CartItem) =>
  Math.round(line.unitPrice * 100) !== Math.round(catalogPriceOf(line) * 100);

export interface CartCustomer {
  id: string;
  name: string;
  loyaltyPoints: number;
  // The customer's group pricing (price list used for the cart, group discount %),
  // as the server gave it when the customer was chosen; kept for offline totals
  group?: CustomerGroupPricing | null;
}

/** Group discount (%) the cart gets: the customer's group's, never on an estimate (quoted prices) */
export const groupDiscountPercentOf = (state: Pick<POSState, 'customer' | 'estimate'>): number =>
  state.estimate ? 0 : Math.min(Math.max(Number(state.customer?.group?.discountPercent ?? 0), 0), 100);

interface POSState {
  registerId: string | null;
  cart: CartItem[];
  customer: CartCustomer | null;
  // Validated discount code (kept whole so totals can be computed offline)
  discount: Discount | null;
  cartDiscount: CartDiscountInput | null;
  notes: string;
  // Held cart this cart was resumed from (checkout completes it)
  heldSaleId: string | null;
  // Estimate loaded into the till: sold at its quoted prices, converted on checkout
  estimate: { id: string; number: string } | null;
  // Staff member credited with the sale (the cashier is the signed-in user)
  salespersonId: string | null;
  // When the cart's prices were last checked against the server / catalog
  pricedAt: string | null;
  // Resumed held cart or loaded estimate: reprice before tendering (spec §5)
  needsRevalidation: boolean;
  // Confirmed repricing, sent with the sale
  repricing: RepricingConfirmation | null;

  setRegister: (registerId: string) => void;
  // quantity: one unit by default; the weight / length of a measured item
  addItem: (item: CatalogItem, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  setLineDiscount: (key: string, percent: number) => void;
  setLineNote: (key: string, note: string) => void;
  setLineDiscountReason: (key: string, reason: string) => void;
  setSalesperson: (salespersonId: string | null) => void;
  // Price override; null restores the catalog price
  setUnitPrice: (key: string, price: number | null) => void;
  removeItem: (key: string) => void;
  setCustomer: (customer: CartCustomer | null) => void;
  setDiscount: (discount: Discount | null) => void;
  setCartDiscount: (discount: CartDiscountInput | null) => void;
  setNotes: (notes: string) => void;
  // Replace catalog prices with the server's (after a quote); overridden prices are kept
  updatePrices: (prices: Map<string, number>) => void;
  // Prices checked and unchanged (or changes confirmed)
  markPriced: () => void;
  // Apply the confirmed new prices / tax rates (by line key) and discount, and record the confirmation
  applyRepricing: (
    values: { catalogPrices: Map<string, number>; taxRates: Map<string, number | null>; discount: Discount | null },
    confirmation: RepricingConfirmation
  ) => void;
  // Load a resumed held cart (replaces the current cart)
  loadCart: (cart: ResumedCart, extra: { customer: CartCustomer | null; discount: Discount | null }) => void;
  // Load an estimate (replaces the current cart); quoted prices become the line prices
  loadEstimate: (
    estimate: { id: string; number: string; cartDiscount: CartDiscountInput | null; notes: string | null },
    lines: Omit<CartItem, 'key'>[],
    customer: CartCustomer | null
  ) => void;
  clearCart: () => void;
}

export const usePOSStore = create<POSState>()(
  persist(
    (set, get) => ({
      registerId: null,
      cart: [],
      customer: null,
      discount: null,
      cartDiscount: null,
      notes: '',
      heldSaleId: null,
      estimate: null,
      salespersonId: null,
      pricedAt: null,
      needsRevalidation: false,
      repricing: null,

      setRegister: (registerId) => set({ registerId }),

      addItem: (item, quantity = 1) => {
        const cart = get().cart;
        const measured = isMeasured(item.unit);
        // Scanning the same item again adds to the existing line at the normal price.
        // Measured items never merge: each weighing is its own line (1.250 kg, 0.800 kg)
        const existing = measured
          ? undefined
          : cart.find(
              (line) => line.variantId === item.variantId && line.discountPercent === 0 && !isPriceOverridden(line)
            );
        if (existing) {
          set({
            cart: cart.map((line) =>
              line.key === existing.key ? { ...line, quantity: line.quantity + quantity } : line
            ),
          });
          return;
        }
        set({
          // A new cart is priced from the catalog it was rung up from
          ...(cart.length === 0 ? { pricedAt: new Date().toISOString() } : {}),
          cart: [
            ...cart,
            {
              key: randomId(),
              variantId: item.variantId,
              productId: item.productId,
              categoryId: item.categoryId,
              productName: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              unitPrice: item.price,
              catalogPrice: item.price,
              quantity: measured ? roundToUnit(quantity, item.unit) : quantity,
              discountPercent: 0,
              // Services: no stock count and no limit
              stock: item.stockTracked === false ? null : item.stock,
              stockTracked: item.stockTracked ?? true,
              taxRate: item.taxRate ?? null,
              unit: item.unit ?? null,
            },
          ],
        });
      },

      setQuantity: (key, quantity) =>
        set({
          cart:
            quantity <= 0
              ? get().cart.filter((line) => line.key !== key)
              : get().cart.map((line) =>
                  line.key === key ? { ...line, quantity: roundToUnit(quantity, line.unit) } : line
                ),
        }),

      setLineDiscount: (key, percent) =>
        set({
          cart: get().cart.map((line) =>
            line.key === key
              ? { ...line, discountPercent: Math.min(Math.max(percent, 0), 100) }
              : line
          ),
        }),

      setLineNote: (key, note) =>
        set({ cart: get().cart.map((line) => (line.key === key ? { ...line, note: note.slice(0, 255) } : line)) }),

      setLineDiscountReason: (key, reason) =>
        set({
          cart: get().cart.map((line) => (line.key === key ? { ...line, discountReason: reason.slice(0, 255) } : line)),
        }),

      setSalesperson: (salespersonId) => set({ salespersonId }),

      setUnitPrice: (key, price) =>
        set({
          cart: get().cart.map((line) =>
            line.key === key
              ? { ...line, unitPrice: price === null ? catalogPriceOf(line) : Math.max(0, Math.round(price * 100) / 100) }
              : line
          ),
        }),

      removeItem: (key) => set({ cart: get().cart.filter((line) => line.key !== key) }),

      setCustomer: (customer) => set({ customer }),
      setDiscount: (discount) => set({ discount }),
      setCartDiscount: (cartDiscount) => set({ cartDiscount }),
      setNotes: (notes) => set({ notes }),

      updatePrices: (prices) =>
        set({
          cart: get().cart.map((line) => {
            if (!prices.has(line.variantId)) return line;
            const catalogPrice = prices.get(line.variantId)!;
            return {
              ...line,
              catalogPrice,
              unitPrice: isPriceOverridden(line) ? line.unitPrice : catalogPrice,
            };
          }),
        }),

      markPriced: () => set({ pricedAt: new Date().toISOString(), needsRevalidation: false }),

      applyRepricing: (values, confirmation) =>
        set({
          cart: get().cart.map((line) => {
            const catalogPrice = values.catalogPrices.get(line.key);
            if (catalogPrice === undefined) return line;
            return {
              ...line,
              catalogPrice,
              unitPrice: isPriceOverridden(line) ? line.unitPrice : catalogPrice,
              taxRate: values.taxRates.has(line.key) ? values.taxRates.get(line.key) : line.taxRate,
            };
          }),
          discount: values.discount,
          repricing: confirmation,
          pricedAt: new Date().toISOString(),
          needsRevalidation: false,
        }),

      loadCart: (resumed, extra) =>
        set({
          heldSaleId: resumed.heldSaleId,
          pricedAt: null,
          needsRevalidation: true,
          repricing: null,
          salespersonId: resumed.salespersonId ?? null,
          customer: extra.customer,
          discount: extra.discount,
          cartDiscount: resumed.cartDiscount,
          notes: resumed.notes ?? '',
          cart: resumed.items.map((item) => ({
            key: randomId(),
            variantId: item.variantId,
            productId: item.productId,
            categoryId: item.categoryId,
            productName: item.productName,
            variantName: item.variantName,
            sku: item.sku,
            unitPrice: item.unitPrice,
            catalogPrice: item.catalogPrice,
            quantity: item.quantity,
            discountPercent: item.discountPercent,
            stock: item.stock,
            stockTracked: item.stockTracked ?? true,
            taxRate: item.taxRate,
            note: item.note ?? undefined,
            discountReason: item.discountReason ?? undefined,
            unit: item.unit ?? null,
            reserved: item.stockTracked === false ? undefined : item.quantity,
          })),
        }),

      loadEstimate: (estimate, lines, customer) =>
        set({
          estimate: { id: estimate.id, number: estimate.number },
          heldSaleId: null,
          pricedAt: null,
          needsRevalidation: true,
          repricing: null,
          customer,
          discount: null,
          cartDiscount: estimate.cartDiscount,
          notes: estimate.notes ?? '',
          cart: lines.map((line) => ({ ...line, key: randomId() })),
        }),

      clearCart: () =>
        set({
          cart: [],
          customer: null,
          discount: null,
          cartDiscount: null,
          notes: '',
          heldSaleId: null,
          estimate: null,
          salespersonId: null,
          pricedAt: null,
          needsRevalidation: false,
          repricing: null,
        }),
    }),
    { name: 'pos-cart' }
  )
);

/**
 * Cart totals using the same calculation as the server
 */
export function computeTotals(
  state: Pick<POSState, 'cart' | 'discount' | 'cartDiscount'> & Partial<Pick<POSState, 'customer' | 'estimate'>>,
  tax: { taxRate: number; pricesIncludeTax: boolean }
): CalcResult {
  return calculateSale(
    state.cart.map((line) => ({
      key: line.key,
      productId: line.productId,
      categoryId: line.categoryId,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountPercent: line.discountPercent,
      taxRate: line.taxRate ?? null,
    })),
    {
      taxRate: tax.taxRate,
      pricesIncludeTax: tax.pricesIncludeTax,
      discount: state.discount,
      cartDiscount: state.cartDiscount,
      groupDiscountPercent: groupDiscountPercentOf({ customer: state.customer ?? null, estimate: state.estimate ?? null }),
    }
  );
}
