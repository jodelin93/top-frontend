---
id: products-create
title: Create or edit a product
category: Catalog
order: 802
routes: [/admin/products]
keywords: [new product, add product, create product, edit product, SKU, selling price, price, cost, tax category, minimum stock, reorder point, image, photo, product type, simple, variable, composite, bundle, serial number]
related: [products-list, products-variants, categories, tax-categories]
---
1. On the **Products** page, click **New product**.
2. Fill in **Name** and **SKU** (your internal code, unique).
3. If needed, add a **Description** and a **Barcode** (the one printed on the packaging).
4. Choose the **Type** (see the table).
5. Enter the **Selling price** and the **Unit cost** (purchase price, useful for margins).
6. Choose the **Category** and the **Tax category**. Leave **Store default tax rate** if the product uses the normal rate.
7. If needed, complete **Brand**, **Manufacturer**, **Unit of measure**, and **Tags** (type a word, then Enter).
8. In **Branch assortment**, check branches only if the product is not sold everywhere.
9. Enter the **Min stock level** and the **Reorder point** for low-stock alerts.
10. Leave **Track stock** checked for a physical item; uncheck it for a service. Check **Track serial numbers** for devices sold with a serial number.
11. Click **Create product**.

![The New product form](shot:product-form)

| Type | When to use it |
| --- | --- |
| **Simple** | A single item, a single price. The price is entered on the product form. |
| **Variable (has variants)** | The same product in several sizes or colors: each variant has its own SKU, barcode, price, and stock. |
| **Composite (bundle)** | A bundle or gift set sold as a single item. |

> **Warning:** the type cannot be changed after creation. For a variable or composite product, the price is entered in the [variants](topic:products-variants) after saving.

> **Tip:** if the check digit of an EAN or UPC barcode is wrong, the app warns you.

## Edit a product and add images

1. Click the pencil on the product's row.
2. Change the fields you need. **Status** sets the product to **Active**, **Inactive**, or **Discontinued**.
3. At the bottom, in **Images**, click **Add images**: JPEG, PNG, or WebP up to 5 MB, 10 images per product.
4. Click the star on an image to make it the main image (lists and till).
5. Click **Save changes**.

> **Tip:** images can only be added after creation: create the product first, then open it again.
