---
id: settings-weighted-barcodes
title: Scale labels (weighed items)
category: Settings
order: 1312
routes: [/admin/settings]
keywords: [scale, scale label, weighed barcode, weight barcode, prefix, PLU, weight, price, decimals, EAN 20, deli, produce]
related: [pos-weighed-items, products-units-weight]
---
A label scale prints a barcode that contains the item code (PLU) and the weight or the price. The till can read it if the format is set.

1. Open **Settings**, **General** tab, **Scale labels (weighed items)** section.
2. In **Prefixes read as scale labels**, select the prefixes your scale uses (barcodes starting with 20 to 29). No prefix selected: scale labels are turned off.
3. Choose what **The label holds**: **The weight** or **The price**.
4. Set the **PLU digits** (after the prefix) and the **Decimals of the value** (2 = cents; 3 = grams read as kg), as in the scale's manual.
5. Click **Save settings**.

In each product sold by weight, enter the same code in **PLU (scale code)** (see [Units and products sold by weight](topic:products-units-weight)).

> **Tip:** do a test: weigh an item, scan the label at the till and check the line's quantity and price.
