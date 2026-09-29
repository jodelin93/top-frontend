---
id: settings-branches
title: Branches, registers and sale numbering
category: Settings
order: 1305
routes: [/admin/settings?tab=branches, /admin/settings]
keywords: [branch, store, register, till, new register, cash drawer, shared drawer, numbering, prefix, branch code, timezone, location]
related: [settings-warehouses, shifts-open, devices]
---
A branch is a physical store. Each register belongs to a branch.

![The Branches & registers tab](shot:settings-branches)

## Create a branch

1. In the **Branches & registers** tab, click **New branch**.
2. Fill in the **Name**, the **Code**, the address, the **Timezone** (America/Port-au-Prince) and the **Currency**.
3. Click **Create branch**.

The **Code** is used as the prefix for sale numbers: MAIN-000123, DT-000045… Each branch has its own sequence. Choose short, clear letters. Older sales keep their original number (for example S-000544).

## Create a register

1. Under **Registers**, click **New register**.
2. Choose the **Branch** and the **Stock location** the register takes sold items from.
3. Choose the **Drawer policy**: **One cashier per drawer** or **Shared drawer**.
4. Click **Create register**.

In a register's details, the **Cash drawers** section lists its drawers: **Add drawer**, **Activate** or **Deactivate**.

> **Warning:** a register without a stock location cannot sell.
