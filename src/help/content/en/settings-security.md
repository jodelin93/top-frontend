---
id: settings-security
title: Offline and security
category: Settings
order: 1310
routes: [/admin/settings?tab=security, /admin/settings]
keywords: [offline, offline window, offline limits, security, require two-factor authentication, 2FA, MFA, administrators, admins, takes effect, effective date]
related: [offline-mode, account-2fa, settings-history]
---
1. Open the **Offline & security** tab.
2. Set the **Offline selling window (hours)**: after this time without a connection, the till locks.
3. If needed, set **Largest offline sale**, **Offline sales per window** and **Offline sales total per window** (0 = no limit).
4. Check **Require two-factor authentication for admins** if you want to enforce it.
5. In **Takes effect**, leave it empty to apply right away, or choose a future date.
6. Add a **Note (optional)**, then click **Save**.

![The Offline & security tab](shot:settings-security)

| Setting | Meaning |
| --- | --- |
| **Offline selling window (hours)** | How long a till can sell without a connection. |
| **Largest offline sale** | Above this, the sale is recorded but sent to the [Review queue](topic:review-queue). |
| **Offline sales per window** | Maximum number of offline sales before the till must reconnect. |
| **Offline sales total per window** | Maximum total amount sold offline. |

When two-factor authentication is required, people who manage users, roles, settings or the audit log must turn it on: until they do, they land on **Account security** when they sign in.

> **Warning:** tell the administrators before checking this box: each of them needs an authenticator app on their phone (see [Turn on two-factor authentication](topic:account-2fa)).
