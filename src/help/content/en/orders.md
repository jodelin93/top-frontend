---
id: orders
title: Follow orders and their deposits
category: Sales and expenses
order: 608
routes: [/admin/orders]
keywords: [orders, deposit, advance, balance due, pickup, ready, cancelled, refund deposit, keep deposit, order deposits report]
related: [pos-orders, shifts-admin, reports-overview]
---
The **Orders** page lists the services prepared for customers who paid a deposit. Each order shows its **Total**, **Deposits paid**, **Balance due**, **Ready by** date and status: **In preparation**, **Ready**, **Picked up** or **Cancelled**.

1. Choose a status (by default **Waiting for the customer**: in preparation or ready).
2. Search by order number, customer name or phone.
3. Click an order to see its lines, every deposit (date, method, who took it) and its history.

From an order you can **Print** the order receipt, **Add a deposit**, **Mark ready** or **Cancel the order**. The customer picks it up at the till: **Orders**, then **Pick up: take the balance**.

## Where the money appears

- **Cash session**: a cash deposit is a paid-in of the session that took it. Every deposit is listed under **Order deposits** in the session and on the Z report.
- **Reports**: the **Order deposits** report lists each deposit and refund. **Payments by method** counts deposits when they are paid.
- **Sales**: the sale is counted at pickup, for the full total. Its **Deposit paid** line is not counted again as money received.

## Cancel an order

Click **Cancel the order**, type the reason and choose **Give the deposits back** or **Keep the deposits**. A cash refund comes out of an open session on a register of the order's branch. Cancelling needs the permission "Cancel orders and refund or keep their deposits", or a manager's approval.

> **Note:** branch staff see only their branches' orders. Orders are for items not tracked in stock (services).
