---
id: approvals
title: Get a manager to approve an action
category: Till
order: 210
routes: []
keywords: [approval, approve, manager, supervisor, authorization, override, credentials, second person, denied, permission]
related: [getting-started-roles, pos-discounts, pos-price-change, faq-till, expenses-approve]
---
When someone tries an action they are not allowed to do alone, the **Manager approval needed** window opens. It shows the missing permission. A manager who is present can approve without anyone signing out.


1. The manager types their **Manager email** and **Password**.
2. If they turned on two-factor authentication, they also type the **Two-factor code**.
3. They click **Approve**. The action continues as usual.
4. If several actions need approval (a price and a discount, for example), the window comes back for each one.

To give up, click **Cancel**.

## Actions that often need approval

| Action | Who needs it |
| --- | --- |
| Change a price, discount above the limit | Cashier, at checkout |
| **On account** (credit) sale, going over the credit limit | Cashier |
| Cash in, cash out, safe drop, cash variance | Cashier (see [Shifts](topic:shifts-cash-movements)) |
| Late return, refund to another method, void | Anyone without the permission |
| Approve your own expense or your own purchase order | Everyone, even the owner |
| Large top-up on a gift card or store credit | Second person required |

## Rules

- The manager must have the requested permission themselves.
- The manager must be a different person from the one doing the action.
- An approval works only once, for this action only, and lasts 2 minutes.
- Every approval is recorded in the [audit log](topic:audit-log), with the manager's name (**Approved by**).

> **Warning:** the manager never gives out their password: they type it into the window themselves.
