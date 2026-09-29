---
id: inventory-counts
title: Do a stock count
category: Inventory
order: 905
routes: [/admin/inventory?tab=counts, /admin/inventory]
keywords: [stock count, stocktake, inventory count, physical count, count, blind count, variance, discrepancy, approve, recount, cycle count]
related: [inventory-adjust, inventory-stock, approvals]
---
A count compares the real stock with the recorded stock, for a whole location or a single category.

![The Counts tab](shot:inventory-counts)

## Start

1. Click the **Counts** tab, then **New count**.
2. Choose the **Location** and a **Category** (or **All products**).
3. Leave **Blind count** checked: counters do not see the expected quantities.
4. Add **Notes** and click **Start count**.

> **Tip:** expected quantities are frozen at the start. You can keep selling during the count: those sales do not count as variances.

## Enter and submit

1. Open the count (status **Counting**).
2. Enter the quantity in **Counted** and, if there is a variance, a **Reason**. Leave a line empty if it was not counted: it will not be adjusted.
3. Click **Save counts** to continue later, or **Submit count**.

The app shows the variances, the units over or short, and the net value.

> **Warning:** if all variances stay within the store tolerance, the count is posted right away. Otherwise it goes to **Needs approval**: someone other than the counter, with the **Approve stock count variances** permission, must approve it.

## Approve (manager)

1. Open the count in **Needs approval** and check each variance and its reason.
2. Click **Approve & post** to correct the stock, or **Send back** to have it recounted.

**Cancel count** stops it without changing anything.
