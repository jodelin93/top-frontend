---
id: products-import
title: Import products (Excel or CSV)
category: Catalog
order: 806
routes: [/admin/import]
keywords: [import, import products, CSV, file, spreadsheet, Excel, template, bulk update, mass update, columns, upload]
related: [products-list, categories]
---
Import creates or updates many products from an Excel file (.xlsx) or a CSV file. You always see the changes before they are saved. You need the **Import products from CSV** permission.

![The Import products page](shot:admin-import)

1. In the menu, click **Import**.
2. Click **Excel template** (or **CSV template**) to get a file with the right columns.
3. Fill in the file and save it: as an Excel workbook (.xlsx, only the first sheet is read) or as CSV UTF-8. 5,000 rows and 2 MB maximum.
4. Choose what happens to **Existing products (same SKU)**: **Update their details** or **Leave them unchanged**.
5. Check **Also replace their prices and costs** only if the file contains the new prices.
6. Click **Choose file** and select your Excel or CSV file.
7. Review the summary: **New products**, **Updates**, **No change** and **Rows with errors**.
8. Fix the rows with errors if needed, then click **Import N products**.

Main columns:

- **sku** (required): identifies existing products;
- **name**: required for a new product;
- **category_code** and **tax_category_code**: existing codes;
- **price** and **cost**: simple products only, with a decimal point (e.g. 4.50);
- **product_type**: simple, variable or composite;
- **status**: active, inactive or discontinued.

> **Tip:** an empty cell leaves the existing value unchanged.

> **Tip:** the old Excel format (.xls) is not read: in Excel, use **Save As › Excel Workbook (.xlsx)**. In the Excel template every cell is text, so codes keep their leading zeros.

> **Warning:** the allow_backorder column is ignored: selling below zero stock is never allowed.
