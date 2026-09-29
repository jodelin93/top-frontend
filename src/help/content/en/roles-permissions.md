---
id: roles-permissions
title: Roles and permissions
category: Staff
order: 1205
routes: [/admin/roles]
keywords: [role, permissions, rights, access, access rights, new role, custom role, built-in, select all]
related: [getting-started-roles, users-manage, approvals]
---
A role is a set of permissions. The four built-in roles (Owner, Admin, Manager, Cashier) are marked **Built-in** and cannot be deleted. The page requires the **Manage roles and permissions** permission.

![The Roles and permissions page](shot:admin-roles)

## View and edit a role's permissions

1. In the list on the left, click a role. The number of people who have it appears under its name.
2. Permissions are grouped by area: **Point of Sale**, **Sales**, **Cash**, **Customers**, and so on.
3. Check or uncheck permissions. **Select all** and **Clear all** act on a whole area.
4. Click **Save** (or **Discard**).

Changes apply the next time each person loads a page.

> **Warning:** you cannot edit a role that has permissions you don't have, or add a permission you don't have. The **Owner** role always has every permission.

## Create a custom role

1. Click **New role**.
2. Type the **Name** (the **Key** is created automatically) and a **Description**.
3. In **Copy permissions from**, choose the starting role, for example **Cashier**.
4. Click **Create role**, check the permissions to add, then **Save**.
5. Assign this role to the right people in **Users**.

To delete a custom role, open it and click **Delete**. Deletion is refused as long as someone still has this role.

> **Tip:** the **Accountant** and **Inventory clerk** roles are examples of custom roles: adapt them to your store.
