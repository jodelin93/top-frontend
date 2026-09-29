---
id: discounts-admin
title: Create a discount or promo code
category: Catalog
order: 809
routes: [/admin/discounts]
keywords: [discount, promo code, coupon, promotion, sale, percentage, percent off, fixed amount, buy X get Y, BOGO, usage limit, validity, expiry]
related: [pos-discounts, price-lists]
---
The **Discounts** page groups the promotions and promo codes that can be used at the till: type, value, number of uses, and validity.

![The discount list](shot:admin-discounts)

1. Click **New discount**.
2. Enter the **Name** and the **Code**. The cashier types this code at the till; it is saved in uppercase.
3. Choose the **Type**: **Percentage off**, **Fixed amount off**, or **Buy X get Y free**.
4. Choose **Applies to**: **Whole cart**, **Specific products**, or **Specific categories**.
5. Enter the value: percentage, amount, or **Buy quantity** and **Get free quantity**.
6. If needed, set a **Minimum purchase**, a **Maximum discount**, and a **Usage limit**.
7. Set the **Priority**: discounts with a higher priority apply first.
8. Enter the **Valid from** and **Valid until** dates.
9. Click **Create discount**.

> **Warning:** the end date must be after the start date and cannot be in the past. A discount whose end date has passed is no longer accepted at the till, even if its status is still **Active**.

> **Tip:** manual discounts given by the cashier (without a code) are limited by the store settings; above that limit, a manager must approve.
