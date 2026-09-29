---
id: employees
title: Manage employees
category: Staff
order: 1201
routes: [/admin/employees]
keywords: [employee, staff, employee profile, employee code, job title, branches, hire date, deactivate, leaving, termination, reactivate]
related: [employees-attendance, users-invitations]
---
An **Employee** is a person who works for the store (job title, branches, hours). A **User** is a sign-in account with a role (see [Add a user](topic:users-invitations)). An employee may or may not have an account: a cleaner has a profile for their hours, a cashier has both, linked.

> **Warning:** the **Employees** page requires the permission to manage employees (owner, administrator, manager). To link a user account, you also need the **Manage staff accounts** permission.

![The employee list](shot:admin-employees)

## Add an employee

1. Click **Add employee**.
2. Fill in **First name** and **Last name** (required).
3. If needed, add **Job title**, **Employee code** (unique), **Phone**, **Email** and **Hire date** (at most one year ahead).
4. In **User account**, choose the account the person signs in with, or **No account**.
5. Under **Branches**, check the branches where the person works and choose the **Primary** one.
6. Add **Notes (optional)**, then click **Save**.

> **Warning:** a user account can be linked to only one employee. A manager limited to certain branches can assign an employee only to their own branches.

## Search and edit

Type a name, employee code or email in **Search by name, code or email**, filter by status or branch, then click the pencil on the row.

## Deactivate an employee who is leaving

You never delete an employee: you deactivate them.

1. Click the red icon (crossed-out person) on the row.
2. Enter the **Last day** (not in the future, and not before the hire date) and a **Reason (optional)**.
3. Click **Deactivate**.

Any open clock-in is closed. If the employee has an account, that account is suspended and signed out of all devices. To bring them back, filter on **Inactive**, then click **Reactivate**.
