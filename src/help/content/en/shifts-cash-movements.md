---
id: shifts-cash-movements
title: Paid in, paid out, safe drops and opening the drawer
category: Shifts
order: 302
routes: [/pos]
keywords: [paid in, paid out, safe drop, safe, drawer, cash drawer, open drawer, no sale, cash movement, petty cash, float]
related: [shifts-open, shifts-close, approvals]
---
Every cash movement that is not a sale must be recorded; otherwise the drawer will be off at closing.

## View the current shift

Click the shift button (for example **SH-000004 · Open**). The **Shift and cash drawer** window shows how the drawer is calculated:

![The current shift](shot:shift-panel)

| Line | Meaning |
| --- | --- |
| **Opening float** | Amount counted at opening. |
| **Cash sales (net of change)** | Cash taken, minus the change given. |
| **Paid in** | Cash added during the day. |
| **Paid out** | Cash taken out for a small expense. |
| **Safe drops** | Cash moved from the drawer to the safe. |
| **Expense payouts** | Expenses paid with money from the drawer. |
| **Expected in drawer** | What should be in the drawer right now. |

## Record a movement

1. In the shift window, click **Paid in**, **Paid out** or **Safe drop**.
2. Enter the **Amount** and the **Reason** (at least 2 characters).
3. If you have a bag or receipt number, enter it in **Reference (optional)**.
4. Click **Record**.

> **Warning:** a cashier is not allowed to make these movements alone: the **Manager approval needed** window opens after **Record**. The manager enters their credentials and clicks **Approve** (see [Get a manager's approval](topic:approvals)).

## Open the drawer without a sale

For example, to make change for a customer. Each opening is recorded with your name and a reason.

1. Click **Open drawer** in the top bar (on a phone: **⋯** then **Open drawer**).
2. Enter the **Reason**, for example "Change for a customer".
3. Click **Record and open**, read the message, then click **Done**.

- **Recorded. The drawer is open.**: the connected drawer opened.
- **Recorded. No hardware connected: open the drawer with its key.**: no drawer is connected to this station.

> **Tip:** the **Open drawer** button only appears when the shift is open. If the drawer did not respond, the opening is still recorded.
