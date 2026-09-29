---
id: faq-hardware
title: "FAQ: printer and cash drawer"
category: FAQ
order: 1605
routes: [/admin/hardware]
keywords: [printer not responding, printer not working, no receipt, drawer won't open, cash drawer, print bridge, paper, scanner not working, barcode scanner, pairing]
related: [hardware, settings-payment-methods]
---
## The printer does not respond

Open **Admin** > **Hardware** and read the print bridge **Status**:

- **Not running**: the bridge is not started on this PC. Start it or restart the PC.
- **Running, not paired with this browser**: type the pairing code shown by the bridge, then click **Pair**.
- **Paired**: check that the printer is on, has paper and is properly plugged in.

Then click **Print a test receipt**. In the meantime, receipts print through the browser's print window.

## The cash drawer does not open

The drawer opens through the receipt printer: check the printer first. It only opens for payments set to **Opens the cash drawer** in [Payment methods](topic:settings-payment-methods). To test it, use **Test drawer kick** in **Hardware**: click only once, the drawer kick is never repeated automatically.

## The barcode scanner adds the wrong items

Set the suffix and the minimum number of characters in **Hardware** > **Barcode scanner**, then check in **Scanner test** that the scanned code is complete.
