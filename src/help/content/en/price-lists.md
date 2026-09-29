---
id: price-lists
title: Price lists
category: Catalog
order: 807
routes: [/admin/price-lists]
keywords: [price list, pricing, rate, promotional price, sale price, wholesale price, member price, priority, validity, valid dates, minimum quantity]
related: [customers-groups, pos-group-pricing, tax-categories, discounts-admin]
---
A price list replaces the base price of some products. The **Price lists & tax** page groups them.

![The Price lists & tax page](shot:admin-price-lists)

| Type | How it applies |
| --- | --- |
| **Standard** | Applied automatically at the till when it is active. |
| **Promotional** | Applied automatically, usually for a limited time (sales). |
| **Wholesale** | For customers in a group that has it as its default list. |
| **Member** | For customers in a group that has it as its default list. |

## Create a list

1. Click **New price list**.
2. Enter the **Name** and the **Code**.
3. Choose the **Type**, the **Currency** and the **Branch** (or **All branches**).
4. Set the **Priority**: the highest one wins if several lists apply.
5. Enter **Valid from** and **Valid to** (leave empty to start right away or to have no end).
6. Click **Create price list**.

> **Warning:** the end date must be after the start date ("Must be after the start date") and cannot be in the past ("The end date cannot be in the past").

## Enter the prices

1. Click the list's row in the table.
2. Click **Add products** and choose the products or variants.
3. Enter the **List price**. Enter a **Min qty** if the price only applies from a certain quantity.
4. Click **Save prices**.

> **Tip:** products not in a list keep their base price. Choose a list as the **Default price list** of a [customer group](topic:customers-groups): the till applies it automatically as soon as a customer from the group is chosen. Minimum-quantity prices are not applied at the till yet.
