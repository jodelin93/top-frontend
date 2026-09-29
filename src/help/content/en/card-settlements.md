---
id: card-settlements
title: Reconcile card settlements
category: Sales and expenses
order: 606
routes: [/admin/payments]
keywords: [card settlements, reconciliation, reconcile, statement, bank, processor, provider, CSV, batch, fees, resolve, card terminal]
related: [pos-payment-card, reports-reconciliation]
---
The **Card settlements** page compares the statements from your bank or payment provider with the card payments taken at the till.

![The Card settlements page](shot:admin-payments)

## Import a statement

1. In the menu, click **Card settlements**.
2. Under **Import a settlement report**, choose the **Provider**.
3. Add a **Batch reference (optional)**, for example "payout 2026-09-21".
4. Choose the **CSV file** you got from the provider (reference, amount, fee and date columns).
5. Click **Import**. Lines are matched to payments by reference and amount.

## Handle what is left "To reconcile"

- **Settlement lines without a payment**: statement lines that no payment covers. Choose the matching payment and click **Match and resolve**, or explain why there is none.
- **Card payments not yet settled**: payments taken that no statement covers yet. Click **Resolve**, write a **Note** (for example "Terminal batch closed late"), then confirm.

> **Tip:** at the bottom of the page, **Imported batches** lists the statements already imported, with the number of matched lines, the gross amount and the fees. **Card terminal per payment method** shows which terminal is linked to each method.
