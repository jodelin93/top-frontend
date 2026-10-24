---
id: categories
title: Organize categories
category: Catalog
order: 805
routes: [/admin/categories]
keywords: [branch, shop, store, category, categories, subcategory, tree, department, aisle, family, sort order, parent category]
related: [products-create, products-import]
---
Categories form a tree: a main category (e.g. Food) can contain subcategories (e.g. Drinks). They organize the till and the reports.

![The Categories page](shot:admin-categories)

1. In the menu, click **Categories**, then **New category**.
2. Enter the **Name** and the **Code** (the code is used in CSV imports).
3. Choose a **Parent category**, or **None (top level)** for a main category.
4. Set the **Sort order** (0 appears first).
5. Leave **Active (shown in the POS and product forms)** checked.
6. Click **Create category**.

> **Tip:** to edit a category, click its pencil. Deactivating a category hides it at the till without changing the products.

## Tie a category to branches

In a category's form (new, or an existing one with the pencil), the **Branches** part chooses where it is shown:

- **none ticked**: the category is shown in every branch;
- **some ticked**: only the staff of those branches see it (cashiers, stock clerks of one shop), in the back office and at the till. The owner, the administrator and a manager of the whole company see every category.

The **Branches** column of the list shows each category's setting. At the till, a category with no product sold at the till's branch is not shown.

> **Tip:** someone limited to some branches can only tie a category to their own branches.
