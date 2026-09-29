---
id: sales-void
title: Void a sale
category: Returns and voids
order: 405
routes: [/admin/sales]
keywords: [void, cancel sale, voided sale, entry error, mistake, undo sale, delete a sale]
related: [returns-pos, sales-history, faq-sales]
---
Voiding corrects a sale entered by mistake: the stock is put back, earned points are removed and payments are reversed. It is done in the admin area.

1. Open **Admin** > **Sales**.
2. Search for the sale by its number, then click it.
3. Click **Void sale**.
4. Read the warning: this action cannot be undone.
5. Type the **Reason**, for example "Entered by mistake".
6. Click the red **Void sale** button. To back out, click **Keep sale**.

![The void confirmation](shot:sale-void)

The sale changes to **Voided**. On-account, gift card or store credit payments are returned to the customer; a gift card sold in this sale is canceled.

| Situation | Can it be voided? | What to do |
| --- | --- | --- |
| **Completed** sale, till shift still open | Yes | Void the sale. |
| The sale's shift is closed | No | Do a [return](topic:returns-pos). |
| The sale already had a return or refund | No (the button no longer appears) | Do a return for the rest. |
| Sale with no shift, made more than 24 hours ago | No | Do a return. |
| Sale paid on a linked card terminal | No | Do a return to refund the card. |

If the void is refused, the reason shows in red under the **Reason** field.

> **Tip:** without the permission to void, the **Manager approval needed** window opens: a manager authorizes the void with their credentials.
