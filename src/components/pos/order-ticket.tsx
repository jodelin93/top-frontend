'use client';

import { useEffect, useRef } from 'react';
import { Printer, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, dialogStickyFooter } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/admin/page-header';
import type { Sale } from '@/lib/api/sales';
import type { StoreSettings } from '@/lib/api/settings';
import { orderCustomerName, type Order } from '@/lib/api/orders';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Receipt } from './receipt';
import { useReceiptPrinter } from './receipt-dialog';
import { t } from '@/i18n';

/**
 * An order's receipt, printed with the till's receipt layout: its lines and
 * total, the deposits paid so far and the balance due at pickup. It is not a
 * sale receipt (the sale is made at pickup), so it is printed without a print job.
 */
export function orderToTicket(order: Order): Sale {
  const deposits = (order.payments ?? []).filter((p) => p.type === 'deposit');
  return {
    id: order.id,
    saleNumber: order.orderNumber,
    branchId: order.branchId,
    registerId: order.registerId,
    customerId: order.customerId,
    userId: order.userId,
    saleDate: order.createdAt,
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    discountAmount: Number(order.discountAmount),
    total: Number(order.total),
    amountPaid: Number(order.paidAmount),
    changeAmount: 0,
    currencyCode: order.currencyCode,
    notes: order.notes,
    status: 'completed',
    metadata: {
      orderTicket: {
        readyBy: order.readyBy,
        paid: Number(order.paidAmount),
        balance: Number(order.balanceDue),
        status: order.status,
      },
    },
    items: (order.items ?? []).map((item) => ({
      id: item.id,
      variantId: item.variantId,
      sku: item.sku,
      productName: item.productName,
      variantName: item.variantName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      total: Number(item.total),
      lineNumber: item.lineNumber,
      taxRate: item.taxRate,
      notes: item.note,
    })),
    payments: deposits.map((p) => ({
      id: p.id,
      paymentMethodId: p.paymentMethodId,
      amount: Number(p.amount),
      reference: p.reference,
      status: 'completed',
      paymentMethod: p.paymentMethod,
      tenderedCurrency: p.tenderedCurrency,
      tenderedAmount: p.tenderedAmount,
      exchangeRate: p.exchangeRate,
    })),
    customer: order.customer ?? null,
    register: order.register as Sale['register'],
    branch: (order.branch ?? undefined) as Sale['branch'],
    user: order.user ? { id: order.user.id, firstName: order.user.name, lastName: null, email: '' } : undefined,
  };
}

/** Shown after an order is taken (or a deposit added): preview and print its receipt */
export function OrderTicketDialog({
  order,
  settings,
  title,
  autoPrint = true,
  onClose,
}: {
  order: Order | null;
  settings?: StoreSettings;
  title?: string;
  autoPrint?: boolean;
  onClose: () => void;
}) {
  const printer = useReceiptPrinter();
  const wide = settings?.receiptFormat === 'a4' || settings?.receiptFormat === 'letter';
  const ticket = order ? orderToTicket(order) : null;

  // Printed at once when the store prints receipts automatically
  const printedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ticket || !autoPrint || !settings?.autoPrintReceipt) return;
    const key = `${ticket.id}:${ticket.amountPaid}`;
    if (printedFor.current === key) return;
    printedFor.current = key;
    setTimeout(() => void printer.print(ticket, { original: true, offline: true, settings }), 300);
  }, [ticket, autoPrint, settings, printer]);

  const close = () => {
    printer.reset();
    onClose();
  };

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && close()}>
      <DialogContent className={wide ? 'max-w-3xl' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle>{title ?? t('Order taken')}</DialogTitle>
          {order && (
            <DialogDescription>
              {t('{number} for {customer}: {paid} paid, {balance} due at pickup.', {
                number: order.orderNumber,
                customer: orderCustomerName(order),
                paid: formatMoney(Number(order.paidAmount), order.currencyCode),
                balance: formatMoney(Number(order.balanceDue), order.currencyCode),
              })}
            </DialogDescription>
          )}
        </DialogHeader>
        <ErrorMessage>{printer.error}</ErrorMessage>
        <div className="max-h-[45vh] overflow-y-auto rounded-md border p-4">
          {ticket && <Receipt sale={ticket} settings={settings} />}
        </div>
        <div className={cn('grid grid-cols-2 gap-2', dialogStickyFooter)}>
          <Button
            variant="outline"
            className="h-12"
            disabled={printer.busy || !ticket}
            onClick={() => ticket && void printer.print(ticket, { original: true, offline: true, settings })}
          >
            <Printer className="h-4 w-4" />
            {t('Print the order receipt')}
          </Button>
          <Button className="h-12" onClick={close} autoFocus>
            <ShoppingCart className="h-4 w-4" />
            {t('Done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
