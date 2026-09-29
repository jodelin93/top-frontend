---
id: audit-log
title: The audit log
category: Hardware and system
order: 1403
routes: [/admin/audit]
keywords: [audit log, audit, traceability, who did it, approved by, action history, activity log, control, compliance]
related: [approvals, system-events, settings-history]
---
The audit log records every sensitive action: who did it, who approved it, and what changed. Entries can never be edited or deleted.

![The audit log](shot:admin-audit)

1. In the menu, click **Audit log**.
2. Type an action in **Filter by action, e.g. sale.voided**.
3. Choose an **Event type** if needed.
4. Click the arrow on a row to see the details (**Before** / **After**, IP address, amounts, sale number…).

The **Who**, **Approved by**, **Target** and **Reason** columns answer the usual questions of an audit.

> **Tip:** useful actions: sale.voided (sale voided), user.password_reset (password reset), role.updated (role changed), session.created (sign-in), auth.login_failed (wrong password).

> **Warning:** the full log is only available to people with access to all branches.
