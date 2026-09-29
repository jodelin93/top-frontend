---
id: review-queue
title: The review queue
category: Sales and expenses
order: 607
routes: [/admin/review]
keywords: [review queue, case, needs review, offline, beyond stock, oversold, close case, resolved, dismiss]
related: [offline-sync, devices, inventory-adjust]
---
The **Review queue** lists sales accepted offline that need to be checked. The sale is already recorded: fix the cause, then close the case with a note.

![The review queue](shot:admin-review)

| Case type | What happened | What to do |
| --- | --- | --- |
| Sold offline beyond stock | The till sold more than the stock | Count the shelf, adjust the stock, then close |
| Offline discount or price not approved | Discount or price changed offline without the right | Check with the cashier, then close |
| Uploaded after its shift closed | The sale is not in the count | Check the shift's cash, then close |
| Sold offline with no shift open | No shift was open | Link the cash to the right shift |
| Sold offline outside the till's lease | Sale made after the offline permission ended | Check the till and the sale |
| Till marked lost | A lost device had unsent sales | Estimate the lost sales, then close |

1. In the menu, click **Review queue**.
2. Keep the **Open** filter to see the cases to handle; choose a type if needed.
3. Click the sale number to open the sale. For a stock problem, click **Open inventory**.
4. Click **Close case**, and write in **Note** what was checked (required).
5. Click **Mark resolved**, or **Dismiss (nothing to do)**.

> **Tip:** each type is handled by whoever has the right: stock by whoever adjusts inventory, till cases by whoever manages shifts. Work through the queue every day.
