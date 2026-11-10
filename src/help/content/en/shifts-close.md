---
id: shifts-close
title: Close the shift, count the drawer and print the Z-report
category: Shifts
order: 303
routes: [/pos]
keywords: [close, close shift, closing, end of day, cash up, count, blind count, variance, over short, tolerance, Z-report, Z report, hand over, recount]
related: [shifts-open, shifts-admin, approvals, shifts-cash-movements]
---
At the end of your shift, count the drawer and close the shift.

1. Click the shift button in the top bar.
2. Click **Close shift**.
3. Leave the **Blind count** box checked: you count without seeing the expected amount, which makes the count more honest.
4. Click **Start count**.

> **Warning:** as soon as the count starts, the till stops selling: the shift changes to **Counting**. To sell again, click **Back to selling**. To return to the count later: **Continue closing**. Cash refunds (returns, exchanges, order deposits) are refused on this register during the count; refunds to a card or store credit still work.

## Count

1. Type the number of each dollar bill and coin.
2. In **HTG cash in the drawer**, type the total gourdes in the drawer (leave empty if there are none).
3. Click **Review count**.

For each currency, the app shows **Counted**, **Expected** and **Variance**:

- no variance or within the tolerance: green message, for example "Within the $5.00 tolerance.";
- variance above the tolerance: red message; a **Variance reason** is required and the cashier must get a manager's approval.

## Finish

1. If a reason is requested, fill in **Variance reason**.
2. If the next cashier takes over this drawer, choose their name in **Hand over to (optional)**: their shift will open with the counted cash. Otherwise, leave **Nobody: just close**.
3. Add **Notes (optional)** if needed. If in doubt, click **Recount**.
4. Click **Close shift** (or **Close and hand over**).

When the variance is above the tolerance, the **Manager approval needed** window opens: the manager checks the drawer, enters their credentials and clicks **Approve**. Their name appears on the Z-report (**Approved by**).

## The Z-report

The **Shift closed** window shows the **Z-REPORT**: times, cashier and manager, sales by payment method, voided sales, drawer calculation in USD and HTG, cash movements, count, variance, tolerance and reason.

> **Tip:** an exchange appears twice. The new items are a sale paid with **Exchange credit: returned goods, not money**; the **Returns** block shows the item brought back, the part **Kept as exchange credit** and any money given back, then **Net sales (sales − returns)**. Example: an item bought yesterday for 3,000 swapped today for one at 2,000 shows a 2,000 sale, a 3,000 return (2,000 kept as exchange credit, 1,000 in cash) and net sales of −1,000; the drawer only loses the 1,000 given back.

1. Click **Print Z-report**.
2. Click **Done**.

> **Tip:** a reprinted Z-report is marked COPY. Reports for past shifts can be found in [Track shifts](topic:shifts-admin). The variance tolerance is set in the store settings.
