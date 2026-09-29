---
id: pos-payment-card
title: Pay by card, MonCash, or bank transfer
category: Till
order: 213
routes: [/pos]
keywords: [card, credit card, debit card, bank card, terminal, card reader, POS terminal, MonCash, mobile payment, bank transfer, wire, reference, approval code, authorization code]
related: [pos-payment, card-settlements, settings-payment-methods]
---
1. Click **Card**, **MonCash**, or **Bank transfer**.
2. Check the amount (these methods take the exact amount).
3. If the **Reference** field appears, type the approval code from the terminal or the MonCash transaction number.
4. Click **Add**, then **Complete sale**.

> **Warning:** always check on the customer's phone or on the terminal that the payment was accepted before clicking **Add**. Without a reference, the app refuses the payment ("MonCash needs a reference (e.g. approval code)").

## With a connected card terminal

If the store has connected a payment terminal, you don't type a code: the card is charged when you complete the sale. The **Card payment** window follows the transaction:

- wait for the customer to present their card;
- if the response is slow, click **Check now**;
- if it fails, click **Try again** or choose **Cancel sale**.

If the customer cancels on the terminal, the sale is not recorded but the cart stays: take another payment.

> **Tip:** card payments are then matched against the bank statements in [Card settlements](topic:card-settlements).
