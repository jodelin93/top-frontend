---
id: returns-exchange
title: Make an exchange
category: Returns and voids
order: 402
routes: [/pos, /admin/returns]
keywords: [exchange, swap, replace, wrong size, price difference, replacement items, incomplete exchanges]
related: [returns-pos, returns-admin]
---
The customer brings back an item and takes another one instead. The exchange records the return and the new sale in a single operation.

1. Click **Returns**, find the sale, then click the **Exchange** tab.
2. Enter the items brought back in **RETURN NOW**, with their **CONDITION**.
3. In **Replacement items**, search for the new item by name, SKU or barcode. Click it to add it; adjust the quantity with **+** and **−**.
4. Fill in the **Reason for the return**, for example "Size too small".
5. Read the summary, for example "Returned $16.49 · new items $14.99 · refund about $1.50".
   If the new item costs less, choose in **Refund to** how to give back the difference. If it costs more, choose the payment method in **The customer pays the difference with**.
6. Choose the **Register**, then click **Exchange**.

The **Exchange recorded** window shows the return's credit note and the new sale number, for example "Exchange complete: new sale MAIN-000006".

> **Tip:** the exact difference is calculated when the exchange is saved. If the new sale fails, the return stays recorded: finish the exchange from **Admin** > **Returns**, in the **Incomplete exchanges** section.
