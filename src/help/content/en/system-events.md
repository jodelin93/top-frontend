---
id: system-events
title: System events
category: Hardware and system
order: 1404
routes: [/admin/system-events]
keywords: [system events, event delivery, outbox, reconciliation checks, dead-lettered, failed, technical support, run checks, diagnostics]
related: [audit-log, reports-reconciliation]
---
This page is for the owner, administrators, and technical support.

![The System events page](shot:admin-system-events)

1. The counters at the top show the delivery lag and the events that are **Pending**, **Failed (retrying)**, or **Dead-lettered**.
2. **Outbox events** lists these events; **Retry** or **Replay** runs an event again.
3. **Reconciliation checks** lists the automatic checks run every day: **Passed**, **Issues found**, or **Running**.
4. Click **Run checks now** to run the checks again, and **Refresh** to update the page.

> **Warning:** if a **Dead-lettered** counter or an **Issues found** check is not zero, contact your technical support.
