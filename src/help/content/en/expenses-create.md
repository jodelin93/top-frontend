---
id: expenses-create
title: Record an expense
category: Sales and expenses
order: 604
routes: [/admin/expenses]
keywords: [expense, cost, charge, spending, supplies, transport, receipt, expense category, draft, submit, petty cash, payee]
related: [expenses-approve, shifts-cash-movements, faq-dates]
---
The **Expenses** page tracks the store's costs: supplies, transport, repairs, rent…

![The expense list](shot:admin-expenses)

1. In the menu, click **Expenses**, then **New expense**.
2. Enter the **Date**, the **Amount**, and the **Description**.
3. Choose the **Category** and enter the **Supplier / payee**.
4. Choose **Paid by**: **Cash**, **Card**, **Bank transfer**, or **Other**.
5. For cash taken from a drawer, choose the register in **From till**. Leave **Not from a till** for petty cash.
6. Enter the **Receipt reference** and **Notes** if needed.
7. Click **Submit** to send it for approval, or **Save draft** to finish it later.

![The New expense form](shot:expense-form)

> **Warning:** an expense date cannot be in the future ("The expense date cannot be in the future").

An expense above the store's approval threshold moves to **submitted** status and waits for [approval](topic:expenses-approve). Below the threshold, it is approved automatically.

> **Tip:** the **Categories** tab creates your expense categories (electricity, repairs…) with **Add category**, for reports.

> **Tip:** an expense paid in gourdes is entered in gourdes: choose **HTG** next to the **Amount**. The app converts it to dollars at the sell rate for the reports and keeps the amount in gourdes. Paid in cash at a register, it comes out of the gourdes in the drawer.
