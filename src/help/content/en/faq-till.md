---
id: faq-till
title: "FAQ: at the till"
category: FAQ
order: 1601
routes: [/pos]
keywords: [problem, discount refused, approval denied, not enough stock, negative stock, product not found, barcode not found, till won't sell, cannot sell, shift]
related: [approvals, pos-discounts, inventory-adjust, shifts-open]
---
## The cashier cannot apply a discount

A cashier can give a discount up to the store limit; above that, they must write a reason, and the **Manager approval needed** window opens at checkout. A manager who is present types their email and password, then clicks **Approve** (see [Get approval](topic:approvals)). If no manager is around, lower the discount or put the cart on hold.

## The approval window rejects the manager

- The manager must have the requested permission themselves: another cashier cannot approve.
- They must not be the person signed in: you cannot approve yourself.
- If they use two-factor authentication, they must type the 6-digit code.
- An approval lasts 2 minutes and covers one action only: start again if the time has run out.

## "Not enough stock" or "Only … in stock"

The till will not sell more than the available stock. Check the shelf and the stockroom. If the real stock is higher, a manager [adjusts the stock](topic:inventory-adjust), then the sale can continue. Offline, the sale is accepted but a case opens in the [Review queue](topic:review-queue).

## The till will not sell

- The shift is not open and the store requires one: [open the shift](topic:shifts-open).
- The shift is in **Counting**: click **Back to selling** or finish closing.
- The **Offline selling is paused** screen: see [Sell offline](topic:offline-mode).

## "No product found for …"

The scanned barcode is not linked to any product. Search for the item by name; a manager can add this code to the variant (see [Barcodes](topic:products-variants)).
