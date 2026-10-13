---
id: products-list
title: The product list and labels
category: Catalog
order: 801
routes: [/admin/products]
keywords: [products, catalog, product list, search, filter, export, CSV, Excel, discontinue, labels, price labels, price tags, print labels]
related: [products-create, products-variants, products-import]
---
The **Products** page (**Catalog** menu) shows your whole catalog: SKU, barcode, category, tax, price, stock, type and status. It requires the permission to manage products (owner, administrator, manager, stock clerk).

![The product list](shot:admin-products)

1. Type a name, SKU or barcode in **Search by name, SKU or barcode...**.
2. If needed, filter by status (**Active**, **Inactive**, **Discontinued**), by **Tags** or by **Branch**.
3. To export the catalog, click **Export CSV** or **Export Excel**.

Each row has icons on the right:

- the pencil (**Edit**) opens the product's page;
- the layers (**Variants**) appear for products with variants;
- the red trash can (**Discontinue**) takes the product off sale.

> **Warning:** a product is never deleted. **Discontinue** sets it to **Discontinued**: it is no longer sold, but its sales and stock history is kept.

At the top of the page, other buttons open: **Units** ([products sold by weight](topic:products-units-weight)), **Attributes** ([variants](topic:products-variants)) and **Print labels**.

## Print price labels

1. Click **Print labels**.
2. Click **Add** next to each product you want, then enter the number of labels.
3. Choose the **Label language**, then click **Prepare … labels**: the labels are shown as they will print.
4. Click **Print**.

Labels are **1 × 1 inch**. Each one shows the name, the price and the barcode of the product code (the SKU when the product has no barcode).

- **With a label printer set up through JodaPrint**, the labels go straight to it, without the browser's print window. The message **… labels sent to the label printer** confirms it. See [Hardware](topic:hardware).
- **Without it**, the browser's print window opens: choose the label printer and a 1 × 1 inch paper there.

> **Tip:** a code made of digits only prints with thicker bars, which scanners read more easily. A very long code does not fit on the label: it is written without a barcode.

> **Tip:** on a phone, products are shown as cards, with the same buttons.
