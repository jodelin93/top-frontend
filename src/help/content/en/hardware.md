---
id: hardware
title: "Hardware: printer, cash drawer and scanner"
category: Hardware and system
order: 1401
routes: [/admin/hardware]
keywords: [JodaPrint, print agent, USB printer, hardware, printer, receipt printer, label printer, labels, thermal printer, print bridge, pairing code, pair, cash drawer, drawer kick, barcode scanner, scanner, customer display]
related: [faq-hardware, customer-display, settings-receipts]
---
Receipts print straight to the thermal printer through **JodaPrint**, a small program installed on the till computer. It works with USB and network printers and opens the cash drawer. Without it, receipts go through the browser's print dialog. The **Hardware** page needs the right to manage hardware (owner, administrator, manager).

![The Hardware page](shot:admin-hardware)

## Print with JodaPrint

The JodaPrint agent is installed and activated once on each till computer. Then:

1. In the admin area, click **Hardware**.
2. Under **Receipt printer (JodaPrint)**, check the status **Connected · version …**.
3. Choose the receipt printer in the list and its **Paper width** (80 mm or 58 mm). The printer with the alias "receipt" in the JodaPrint dashboard is chosen by default.
4. Click **Print a test receipt**.
5. The test receipt starts with a small framed picture. If it prints as symbols instead, choose **Logo format** > **Column (older printers)** and print the test again: the store logo then prints the same way.

| Status | Meaning |
| --- | --- |
| Connected · version … | All good: receipts print without the print dialog. |
| Not found on this computer | The agent is not installed or not started. Click **Download JodaPrint**, install it, then **Refresh**. |
| Installed, not activated | Activate the agent with your JodaPrint account. |
| Refused by the agent | The till's address is not allowed: add it in the JodaPrint dashboard (**Developers › Origins & security**). |
| Not set up on the POS server | The technician must add the JodaPrint signing key on the server. |

> **Warning:** without an Internet connection the till cannot get the print signed: receipts then go through the browser's print dialog, and the drawer opens with its key.

> **Tip:** the printer and paper width are kept in the till's browser: choose them on each till.

## Label printer

Product labels (1 × 1 inch) print on a label printer through JodaPrint, without the browser's print window.

1. In the JodaPrint dashboard, give the label printer the alias **label**. It is then chosen by default.
2. On the **Hardware** page, under **Label printer**, check that the right printer is chosen, or choose it in the list.
3. Load a roll of 1 × 1 inch labels and click **Print a test label**.

Labels are printed from the product list: see [The product list and labels](topic:products-list).

> **Tip:** the label printer is chosen on each computer. Do it once on every computer that prints labels.

## Older method: the print bridge

The **print bridge** is the older way to print, for network printers only. Tills that use JodaPrint do not need it.

Your technician installs the bridge once. Then, on the till PC:

1. Start the print bridge: its window shows a 6-digit **Pairing code**.
2. In the admin area, click **Hardware**.
3. Under **Receipt printer (print bridge)**, type the code in **Pairing code**.
4. Leave the **Bridge address** as is (http://127.0.0.1:17777), unless your technician says otherwise.
5. Click **Pair**. The status changes to **Paired**.
6. Click **Print a test receipt**.

| Status | Meaning |
| --- | --- |
| Not running | The bridge is not running on this PC. Start it. |
| Running, not paired with this browser | Type the pairing code. |
| Paired · version … | Everything works. |

> **Warning:** pairing is specific to each browser and each till: do it again if you change PC or browser. **Unpair** removes the pairing.

> **Tip:** after several wrong codes, the bridge shows a new code. After 10 errors from the same page, that page can no longer pair (the POS still can); after 50 errors in all, you must restart the bridge in pairing mode.

## Drawer, scanner and display

- **Cash drawer**: **Test drawer kick** sends a single pulse. Make sure nobody is standing in front of it.
- **Barcode scanner**: set the suffix (**Enter**, **Tab** or none), the minimum number of characters and the timings, then click **Save scanner settings**. Test in **Scanner test**.
- **Customer display**: **Open customer display** opens a second window to place on the screen facing the customer (see [The customer display](topic:customer-display)).

These settings are kept in the till's browser: set them on each till. The page also lists the **Supported devices**.
