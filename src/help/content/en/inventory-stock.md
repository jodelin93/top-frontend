---
id: inventory-stock
title: View stock and spot low stock
category: Inventory
order: 901
routes: [/admin/inventory, /admin/inventory?tab=stock]
keywords: [stock, inventory, stock levels, on hand, location, available, reserved, in transit, low stock, sellable, quarantine, stock clerk]
related: [inventory-receive, inventory-adjust, purchasing-reorder, notifications]
---
All stock tasks are done in **Admin** > **Inventory**. The tabs are **Stock**, **Movements**, **Counts**, **Transfers**, **Aging** and **Valuation**. The stock clerk, manager, administrator and owner have access; a cashier only checks stock at the till.

The **Stock** tab shows, for each product and each location, the **On hand**, **Reserved**, **Available** and **In transit** quantities, with the **Last counted** and **Last received** dates.

![The Stock tab](shot:inventory-stock)

1. Type a name, SKU or barcode in the search.
2. Choose a location in **All locations** to see a single store or warehouse.
3. Check **Sellable only** to hide non-sellable locations (quarantine, damaged).

> **Tip:** only stock in a sellable location can be sold. Quarantined or damaged stock is kept apart and has a yellow tag.

## Spot low stock

A product is low on stock when its quantity reaches or falls below its **Min stock level** (product profile).

1. Check **Low stock only**. The affected rows have the red **Low** tag.
2. Order these products (see [Reorder](topic:purchasing-reorder)).

> **Tip:** the app checks stock regularly and sends an alert to the bell for each location with low stock. The alert disappears when the stock is replenished.
