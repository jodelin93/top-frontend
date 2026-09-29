---
id: devices
title: Devices (registered tills)
category: Hardware and system
order: 1402
routes: [/admin/devices]
keywords: [devices, tills, registers, sync, synchronization, offline lease, revoke, mark lost, lost device, stolen, rename, import unsynced sales]
related: [offline-sync, offline-mode, review-queue, settings-security]
---
Each browser that opens the till registers itself as a **Device**. The **Devices** page (owner, administrator) shows their status.

![The Devices page](shot:admin-devices)

1. At the top, three counters: **Active devices**, **Offline sales waiting** and **Devices needing attention**.
2. **Sync status** shows, per till, the unsynced sales, the retries, the sales to check and the cases to review.
3. Click **Refresh** to update the figures.

Further down, each device shows its **Status**, **Last seen**, **Last sync**, its **Pending** sales and the **Offline until** date (end of its permission to sell without Internet). **Expired** means the till has not connected for too long; each reconnection renews the permission.

> **Tip:** an unsent amount other than 0 means a till is holding offline sales. Reconnect it as soon as possible.

## Import unsynced sales

If a till can no longer connect, a manager exports its sales from the till (**Offline sales** window, **Export unsynced sales**).

1. Click **Import unsynced sales**.
2. Choose the exported file and the original till in **Till the sales come from**.
3. Click **Import**. A summary shows the sales recorded, already received, to check and to retry.

## Rename, revoke, mark lost

| Button | When | Effect |
| --- | --- | --- |
| **Rename** | Give a clear name ("Till 1 - counter") | No other effect. |
| **Revoke** | A till must no longer sell offline (PC replaced, doubt) | It loses this right at once; people signed in on it are signed out. **Restore** undoes the revocation. |
| **Mark lost** | PC or tablet stolen, lost or abandoned | Permanent revocation, sessions closed, unsent sales refused; a "Till marked lost" case opens in the [Review queue](topic:review-queue). |

> **Warning:** **Mark lost** cannot be undone. First check whether unsent sales remain and try to export them.
