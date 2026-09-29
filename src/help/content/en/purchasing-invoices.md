---
id: purchasing-invoices
title: Record a supplier invoice
category: Purchasing
order: 1004
routes: [/admin/purchasing?tab=invoices, /admin/purchasing]
keywords: [supplier invoice, vendor invoice, bill, three-way match, price variance, quantity variance, due date, opening balance, void invoice, accounts payable]
related: [purchasing-payments, purchasing-receive, faq-dates]
---
The invoice is compared with the purchase order and the quantities received (three-way match).

![The Invoices tab](shot:purchasing-invoices)

1. Click the **Invoices** tab, then **New invoice**.
2. Choose the **Supplier** and the **Type** (**Invoice** or **Opening balance**).
3. Enter the **Supplier invoice number** and the **Invoice date** (not in the future).
4. Leave the **Due date** empty to use the supplier's terms; otherwise, it cannot be before the invoice date.
5. Choose the **Purchase order**: its received lines appear. Check the invoiced lines and verify quantities and prices.
6. For charges outside the order (shipping…), click **Add a line**.
7. Click **Save invoice**.

The invoice's page shows the **Price variance** and **Qty variance** compared with the order, then what is **Still owed**.

> **Warning:** an invoice with no variance (or within tolerance) is approved right away. Beyond that, it stays **Needs approval**: someone other than the person who entered it must click **Approve**. Only an approved invoice can be paid.

> **Tip:** a wrong invoice cannot be deleted: click **Void invoice** and enter the reason.
