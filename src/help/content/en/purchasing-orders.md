---
id: purchasing-orders
title: Create a purchase order and get it approved
category: Purchasing
order: 1002
routes: [/admin/purchasing, /admin/purchasing?tab=orders]
keywords: [purchase order, PO, supplier order, buying, submit, approve, approval threshold, issued, expected delivery, print]
related: [purchasing-receive, purchasing-suppliers, approvals]
---
![The Purchase orders tab](shot:purchasing-orders)

## Create the draft

1. In **Purchase orders**, click **New order**.
2. Choose the **Supplier** and the **Deliver to** location.
3. Check the **Expected delivery** (calculated from the supplier's lead time; it cannot be in the past).
4. Search for each product and click **Add**. Enter the **Quantity** and the **Unit cost**, and if needed a discount (**Disc. %**) or a **Tax**.
5. Fill in the **Order tax**, **Shipping** (freight costs) and the **Supplier reference**.
6. Add **Notes (printed on the order)**.
7. Click **Save draft**.

## Submit and get approval

1. Open the order by clicking its row, then click **Submit**.
2. Below the store's approval threshold, the order is approved automatically. Above it, the order moves to **Needs approval**.

> **Warning:** an order above the threshold must be approved by someone other than its creator, with the **Approve purchase orders** permission. Even the owner cannot approve their own order.

To approve: the manager opens the order from their own account and clicks **Approve**; or, if the manager is present, the creator clicks **Approve** and the manager enters their credentials in the **Manager approval needed** window.

> **Tip:** **Send back** returns the order to draft with a reason. After approval, click **Mark as issued** when the order is sent to the supplier. **Print** produces the order as a PDF or on paper.
