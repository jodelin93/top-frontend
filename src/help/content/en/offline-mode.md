---
id: offline-mode
title: Selling offline
category: Offline
order: 501
routes: [/pos]
keywords: [offline, no internet, outage, connection down, network, offline lease, offline permission, paused, locked, provisional receipt, sell without internet]
related: [offline-sync, settings-security, devices, faq-offline]
---
The till keeps a copy of products, prices, taxes, and stock on the device. If the Internet goes down, you keep selling: each sale is saved on the device and then sent to the server as soon as the connection returns.

To sell offline, the till must have received an **offline lease** while it was online. It is renewed automatically when the till is connected and stays valid for a set time (24 hours by default, see [Offline and security](topic:settings-security)).

## Sell without Internet

When the connection drops, the indicator at the top changes from **Online** (green) to **Offline** (orange). A banner may remind you of the deadline.

![The till offline](shot:pos-offline)

1. Scan or search for products as usual (search by name, SKU, or barcode works offline).
2. Click **Charge**.
3. Take cash, card, or MonCash, then click **Complete sale**.
4. The **Sale complete** window shows "Saved offline". The receipt has a temporary number that starts with **OFFLINE-**. Give it to the customer as usual.

## What does not work offline

| Feature | Why |
| --- | --- |
| Held carts | They are kept on the server. |
| Gift cards (sale and payment) | The server checks the code and the balance. |
| Points, sale on account, store credit | The server checks the customer's balance. |
| Search for or create a customer | The sale continues as a walk-in customer. |
| Promo codes | The server validates the code. |
| Manager approval | It goes through the server. |
| Returns and voids | The **Returns** button is grayed out. |

> **Warning:** offline, the till does not sell more than the stock it knows about ("Only … in stock on this till (offline)"). A payment in another currency uses the rate stored on the till.

## When offline selling is paused

If the till stays offline too long, the screen locks: **Offline selling is paused**. Possible causes: the lease has expired, the device's clock went backward, or the till was deactivated. Sales already made stay safe. Reconnect, then click **Try again**.

> **Warning:** a new till must be opened at least once with Internet, otherwise it cannot sell offline.
