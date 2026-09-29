---
id: pos-payment
title: "Charge: the payment screen"
category: Till
order: 211
routes: [/pos]
keywords: [checkout, charge, pay, payment, F12, complete sale, tender, payment method, remaining, balance due, currency, split payment, USD, HTG]
related: [pos-payment-cash-change, pos-payment-card, pos-loyalty, pos-gift-cards, pos-on-account, pos-receipt]
---
1. Click **Charge** (**F12** key). On a phone, tap **Charge** in the bottom bar.
2. The **Payment** window shows the **TOTAL**, **RECEIVED** and **REMAINING**, in dollars and in gourdes.
3. Below these boxes, the day's rate is shown, for example **1 USD = 132.5 HTG**.

![The Payment window](shot:pos-payment)

It always works the same way:

1. Choose the currency in **Customer pays in**: **USD** or **HTG**.
2. Click the payment method.
3. Check or type the amount, then click **Add**.
4. Repeat while there is an amount left to pay: one sale can combine several methods and several currencies.
5. Click **Complete sale**.

| Button | Payment method | Good to know |
| --- | --- | --- |
| **Cash** | Cash | The only method that can go over the amount due: the difference becomes the change. See [Cash and change](topic:pos-payment-cash-change). |
| **Card** | Bank card | Exact amount. See [Card, MonCash, bank transfer](topic:pos-payment-card). |
| **MonCash** | Mobile payment | Exact amount. The **Reference** is required. |
| **Bank transfer** | Bank transfer | Exact amount. The **Reference** is required. |
| **Loyalty points** | [Loyalty points](topic:pos-loyalty) | Appears if the customer has points. |
| **Gift card** | [Gift card](topic:pos-gift-cards) | Asks for the card code. |
| **On account** | [Credit sale](topic:pos-on-account) | Needs a customer with an account. |
| **Store credit** | [Store credit](topic:pos-on-account) | Appears if the customer has store credit. |

Method names are set by the store (see [Payment methods](topic:settings-payment-methods)), so they may be different.

> **Tip:** to remove a payment added by mistake, click its trash can in the list.

> **Warning:** if the **Manager approval needed** window opens after **Charge**, the cart contains a restricted action (changed price, large discount…). See [Get a manager to approve](topic:approvals).

Offline, the window shows in orange: "Offline — the sale will be saved on this device and uploaded later." Cash, card and MonCash still work; points, gift cards, on-account sales and store credit need a connection.
