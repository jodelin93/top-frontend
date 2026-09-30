---
id: returns-pos
title: Process a return and refund the customer
category: Returns and voids
order: 401
routes: [/pos, /admin/returns]
keywords: [return, refund, credit note, store credit, receipt, restock, back to stock, damaged, quarantine, dispose, return window, return period]
related: [returns-exchange, returns-goodwill, returns-admin, sales-void]
---
A **return** takes back sold items, even days later. It creates a **credit note**; the original sale stays in the history, marked as refunded. For a sale entered by mistake during the same shift, use a [void](topic:sales-void) instead.

> **Warning:** returns are reserved for people allowed to refund (manager, administrator, owner by default). The cashier does not see the **Returns** button: they call the manager. Offline, the button is grayed out.

## Find the sale and choose the items

1. Click **Returns** in the top bar (on a phone: **⋯** then **Returns**).
2. In **New return**, scan the receipt barcode or type its number, for example MAIN-000001.
3. Click **Find sale**. The sale shows with its customer and payments.
4. Leave the **Return** tab active.
5. For each item brought back, type the quantity in **RETURN NOW** (0 for the others: this is a partial return).
6. In **CONDITION**, choose: **Back to stock**, **Damaged — keep in quarantine** or **Damaged — dispose**.
7. Fill in the **Reason for the return**.

![The New return window](shot:returns-new)

The **REFUND** column calculates the amount per line, including the original discounts and taxes.

## Choose the refund

| Choice in "Refund to" | Effect | Approval |
| --- | --- | --- |
| **Original payment (card first, then cash)** | Refunds to the sale's payment methods. | None. |
| **Customer's store credit** | Creates store credit usable on a future purchase. | None. Needs a customer on the sale. |
| **Cash**, **Card**, **MonCash**… | Refunds to another method. | May need a manager. |

1. Choose **Refund to**, then the **Register** the cash comes out of.
2. Check the summary, for example "2 item(s) · refund about US$2.48".
3. Click **Refund …**.

> **Warning:** cash refunds are taken from the open shift of the chosen register and will show at the count. Past the return window (30 days, for example), a manager's approval is required. The items go back to a location in your branch.

## Hand over the credit note

The **Return complete** window shows the **CREDIT NOTE** document, with its own number (for example MAIN-R-000001) and the original invoice. Click **Print credit note**, have the customer sign if needed, give back the money, then click **Done**.

> **Tip:** if the customer paid in gourdes, the cash refund is given in gourdes, at the rate of the original sale (not today's rate). The window shows the HTG amount to hand back in green, and it comes out of the gourdes in the drawer.
