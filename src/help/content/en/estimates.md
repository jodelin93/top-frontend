---
id: estimates
title: Create an estimate and convert it into a sale
category: Sales and expenses
order: 603
routes: [/admin/estimates]
keywords: [estimate, quote, quotation, pro forma, price offer, valid until, accepted, declined, sell at the till, duplicate, convert to sale]
related: [pos-group-pricing, sales-history, customers-list]
---
An estimate shows prices to a customer before they buy. It does not reserve stock. The **Estimates** page lists every estimate with its status: **Draft**, **Sent**, **Accepted**, **Declined** or **Sold**.

![The estimate list](shot:admin-estimates)

## Create an estimate

1. Click **New estimate**.
2. In **Customer**, type the name, phone number or email and choose the customer. For someone who is not in your customers, just type their name.
3. Check **Valid until** (30 days by default). This date cannot be in the past.
4. In **Add products**, search for each product and click **Add**.
5. For each line, set the **Qty**, the **Unit price** if you are giving a special price, the discount (**Disc. %**) and a **Note**.
6. If needed, add a discount on the whole estimate, **Notes** and **Terms & conditions** (deposit…).
7. Click **Save estimate**. The exact totals (including taxes) are calculated when you save.

## Send the estimate and record the answer

1. Click **Print** (or save as PDF), or **Print pro forma** if the customer asks for a pro forma invoice.
2. Give it to the customer, then click **Mark as sent**.
3. When the customer answers, click **Accepted** or **Declined**.

> **Tip:** **Duplicate** creates a new estimate from this one. **Edit** lets you, for example, extend the validity date.

## Convert into a sale

1. Open the accepted estimate and click **Sell at the till**.
2. The till opens with the customer and the items, at the estimate prices. A banner reminds you: "Estimate … — sold at the quoted prices; completing the sale converts it."
3. Take payment as usual. The estimate changes to **Sold**.

> **Warning:** an expired estimate cannot be sold: edit it first to extend **Valid until**. Estimate prices apply only once, for its customer and its quantities; extra units are charged at the normal price. If the cart already has items, the app asks you to replace them.
