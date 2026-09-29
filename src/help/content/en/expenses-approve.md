---
id: expenses-approve
title: Approve, reject and pay an expense
category: Sales and expenses
order: 605
routes: [/admin/expenses]
keywords: [approve, reject, submitted expense, pay, mark paid, pay expense, second person, approval, threshold, petty cash]
related: [expenses-create, approvals, shifts-cash-movements]
---
Expense statuses: **draft**, **submitted**, **approved**, **rejected**, **paid**.

## Approve or reject

1. The person in charge of approvals (manager or accountant) opens **Expenses** and finds the **submitted** rows.
2. They click **Approve**, or **Reject** and enter the **Reason**.

> **Warning:** an expense must be approved by someone other than the person who recorded or submitted it, even if that person is the owner. If it is your expense, click **Approve** anyway: the **Manager approval needed** window opens and another authorized person enters their **Manager email**, their **Password** (and their two-factor code if needed), then clicks **Approve**. That person is recorded as the approver.


A rejected expense can be edited and submitted again by the person who recorded it.

## Pay

1. On the row of the **approved** expense, click **Pay**.
2. In **Paid from till**, choose the till the money comes out of, or **Not from a till (petty cash)**.
3. Enter a **Payment reference (optional)**.
4. Click **Mark paid**. The expense changes to the **paid** status.

> **Warning:** cash paid from a till is recorded as a pay-out in that till's open shift; with no open shift, the payment is refused. The pay-out will show in the end-of-shift count.
