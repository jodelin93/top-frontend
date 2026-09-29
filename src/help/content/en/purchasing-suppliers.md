---
id: purchasing-suppliers
title: Manage suppliers
category: Purchasing
order: 1001
routes: [/admin/purchasing?tab=suppliers, /admin/purchasing]
keywords: [supplier, vendor, contact, payment terms, lead time, currency, supplier products, preferred supplier, blocked]
related: [purchasing-orders, purchasing-reorder]
---
The whole purchasing cycle happens in **Admin** > **Purchasing**. The tabs you see depend on your permissions: **Purchase orders**, **Suppliers**, **Reorder**, **Supplier returns** (stock clerk, manager…); **Invoices**, **Payments**, **Payables** (manager, administrator, owner).

The **Suppliers** tab lists your suppliers with their contact, payment terms, currency and status.

![The Suppliers tab](shot:purchasing-suppliers)

1. Click **New supplier**.
2. Enter the **Code** and **Name**, then the **Email**, **Phone** and **Tax number**.
3. Enter the **Payment terms (net days)**, for example 30.
4. Enter the **Lead time (days)**: it sets the expected date of new orders.
5. Enter the **Currency** (USD, HTG…); empty = the store's currency.
6. Fill in the **Address**, **City** and **Contacts** (**Add contact**).
7. Click **Save supplier**.

> **Warning:** an **Inactive** or **Blocked** supplier can no longer receive new purchase orders.

> **Tip:** a supplier's **Products** button records, for each product, the supplier code, the last cost, the minimum order quantity and whether it is the **Preferred** supplier. This information is used for [reordering](topic:purchasing-reorder).
