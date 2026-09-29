---
id: purchasing-receive
title: Receive a supplier delivery
category: Purchasing
order: 1003
routes: [/admin/purchasing]
keywords: [receive, receiving, delivery, receive goods, partly received, partially received, GRN, goods receipt, delivery note, damaged, short-close, unplanned receipt]
related: [purchasing-orders, purchasing-invoices, inventory-receive]
---
1. Open the purchase order with the status **Issued** or **Partly received**.
2. Click **Receive goods**.
3. In **Received now**, enter the units that arrived in good condition.
4. In **Damaged**, enter the damaged units. Check **Accept into stock** only if you keep them.
5. Check the **Unit cost** and enter the **Delivery note / invoice number**.
6. Click **Receive**.

If not everything arrived, the order changes to **Partly received**: the rest will be received with the next delivery. Each receipt gets a number (GRN-…) shown in **Goods receipts**.

> **Warning:** receiving more than the ordered quantity is only accepted within the store's tolerance. Above it, a person with the **Approve purchase orders** permission must authorize it.

> **Tip:** if the supplier will never deliver the rest, click **Short-close** and give the reason. For a delivery without a purchase order, use **Unplanned receipt** in the **Purchase orders** tab (specific permission).
