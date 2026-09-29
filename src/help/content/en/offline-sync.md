---
id: offline-sync
title: Uploading offline sales when the connection returns
category: Offline
order: 502
routes: [/pos]
keywords: [sync, synchronization, upload, pending sales, queued sales, upload now, OFFLINE, needs review, export unsynced sales, back online]
related: [offline-mode, devices, review-queue]
---
As soon as the connection returns, the till uploads the sales on its own, then retries regularly if any are left. While sales are waiting, the indicator shows how many, for example **Online · 1 pending**.

1. Click the **Online** / **Offline** indicator.
2. The **Offline sales** window lists the sales still on the device, with their number, time and amount.
3. Click **Upload now** to force the upload.

![The Offline sales window](shot:pos-offline-sales)

| Status shown | Meaning | What to do |
| --- | --- | --- |
| **Waiting to upload** | The sale will be uploaded automatically. | Nothing. Keep the device on and connected. |
| **Upload postponed, next try at …** | The server could not be reached. | Check the connection. |
| **Needs review** | The server refused the sale, with the reason. | Have a manager fix the cause, then click **Retry**. |

Once uploaded, sales move to the **Uploaded** list with the temporary number and the final number, for example **OFFLINE-321E10D8 → MAIN-000008**. In **Admin** > **Sales**, you can search for a sale by its offline number.

> **Warning:** never clear the browser data while sales are waiting: they would be lost. Signing out, however, keeps the waiting sales.

> **Tip:** if a till can no longer connect at all, a manager clicks **Export unsynced sales** in this window (approval required). An administrator imports the file in [Devices](topic:devices).

Offline sales that exceed the real stock or the limits go to the [Review queue](topic:review-queue).
