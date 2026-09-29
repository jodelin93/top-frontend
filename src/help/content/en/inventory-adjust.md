---
id: inventory-adjust
title: Correct stock, view movements and check stock
category: Inventory
order: 903
routes: [/admin/inventory, /admin/inventory?tab=movements]
keywords: [adjustment, adjust stock, correct stock, damaged, breakage, theft, loss, expired, movements, history, ledger, check stock, rebuild, negative stock]
related: [inventory-counts, inventory-stock, review-queue]
---
## Correct stock (adjustment)

An adjustment corrects stock after breakage, theft, an expired date or a counting error.

1. In the **Stock** tab, click **Count / adjust**.
2. Choose the **Location** and the **Reason**: **Stock count (recount)**, **Damaged**, **Theft / loss**, **Expired** or **Other**.
3. Choose the **Mode**: **Set counted quantity** (the difference is calculated) or **Add / remove quantity** (+5 to add, -2 to remove).
4. Explain why in **Notes**.
5. Add the products, enter the quantities, then click **Save adjustment**.

![The Count / adjust window](shot:inventory-adjust)

> **Warning:** stock can never go negative. If you remove more than the stock, the adjustment is refused and the available quantity is shown. This rule also applies to sales, transfers and imports.

> **Tip:** adjustments need the **Adjust stock** permission. Each one gets a number (ADJ-…) shown in the **Movements** tab.

## View movements

The **Movements** tab shows the last 200 movements: sales, returns, receipts, transfers, adjustments and counts. Filter by location; each row shows the **Type**, the **Quantity** (+ in, − out), the **Reference** and the **Notes**. This history is the reference.

## Check and rebuild stock

1. In **Movements**, click **Check stock**.
2. Choose the **Scope**: **Whole store** or one location.
3. Click **Check (dry run)**: nothing is changed.
4. If all is well: **Everything matches the ledger. Nothing to fix.**
5. Otherwise, review the differences, then click **Apply corrections**.

> **Warning:** **Apply corrections** replaces the recorded quantities with those from the history. Leave this action to the manager or administrator.
