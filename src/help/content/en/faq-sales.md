---
id: faq-sales
title: "FAQ: sales and currencies"
category: FAQ
order: 1604
routes: [/admin/sales]
keywords: [void a sale, cancel sale, cannot void, void refused, exchange rate changed, old receipt, return, currency, other branch]
related: [sales-void, returns-pos, settings-exchange-rate]
---
## I can't void a sale

Voiding needs the **Void sales** permission (manager, administrator, owner); a cashier can do it with a manager's approval. It is also refused when:

- the sale's shift is already closed (or, with no shift, the sale is more than 24 hours old);
- the sale already has a return or a refund;
- the sale was paid through a connected card terminal.

In these cases, do a [return](topic:returns-pos): it puts the stock back and refunds the customer while keeping a clean record.

> **Tip:** a refusal message may read, for example, "This sale's shift is closed: use a return instead of a void": the shift is closed, so do a return.

## The exchange rate changed

A manager updates the rate on the **Exchange rates** card (see [Exchange rate](topic:settings-exchange-rate)). The new rate applies right away to new sales. Sales already made keep their rate: an old receipt never changes, and a return follows the amount of the original sale.

## I can't see another branch's sales

Your account is probably limited to certain branches. Ask an administrator to change your **Branch access** in **Users**.
