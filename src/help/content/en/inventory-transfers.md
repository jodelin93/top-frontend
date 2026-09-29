---
id: inventory-transfers
title: Transfer stock between locations
category: Inventory
order: 904
routes: [/admin/inventory?tab=transfers, /admin/inventory]
keywords: [transfer, move stock, move, ship, dispatch, send, receive, in transit, missing, warehouse, branch, approval]
related: [inventory-stock, settings-warehouses, approvals]
---
A transfer moves stock from one location to another (from the warehouse to a branch, for example). It goes through three steps: draft, dispatch, receipt.

![The Transfers tab](shot:inventory-transfers)

## Create the transfer

1. Click the **Transfers** tab, then **New transfer**.
2. Choose the **Origin** location and the **Destination** location.
3. Add the products and enter the **Quantity** of each, with **Notes** if needed.
4. Click **Save draft**.

> **Tip:** a draft does not move stock. You can still **Edit** it or cancel it (**Cancel transfer**).

## Dispatch

1. Click the transfer's row to open it.
2. If the **Submit for approval** button appears, click it and wait for a manager to click **Approve**.
3. Click **Dispatch...**, and enter in **Now** the units that are leaving.
4. Check **This is the last dispatch** if the rest will never be sent.
5. Click **Dispatch**. The units leave the origin and become **In transit**.

## Receive at the destination

1. On arrival, open the transfer and click **Receive...**.
2. Enter the quantities that arrived as **Good**, **Damaged**, and **Missing**.
3. Click **Receive**. The transfer moves to **Received** status; its **History** keeps every step.

> **Warning:** missing units stay in transit until they are found. If they are lost, click **Write off missing** and enter the reason.

> **Warning:** in **Transfer settings**, the manager chooses when a transfer must be approved before dispatch: **Never**, **Above a value**, or **Always**. The person who requested the transfer cannot approve it themselves. The **Over-receipt tolerance (%)** sets how many extra units can be received without approval.
