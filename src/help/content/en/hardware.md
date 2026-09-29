---
id: hardware
title: "Hardware: printer, cash drawer and scanner"
category: Hardware and system
order: 1401
routes: [/admin/hardware]
keywords: [hardware, printer, receipt printer, thermal printer, print bridge, pairing code, pair, cash drawer, drawer kick, barcode scanner, scanner, customer display]
related: [faq-hardware, customer-display, settings-receipts]
---
The **Print bridge** is a small program installed on the till PC. It sends receipts to the thermal printer and opens the cash drawer. Without it, receipts go through the browser's print window. The **Hardware** page requires the right to manage hardware (owner, administrator, manager).

![The Hardware page](shot:admin-hardware)

## Pair the print bridge

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

> **Tip:** after several wrong codes, the bridge shows a new code. After 10 errors, you must restart it in pairing mode.

## Drawer, scanner and display

- **Cash drawer**: **Test drawer kick** sends a single pulse. Make sure nobody is standing in front of it.
- **Barcode scanner**: set the suffix (**Enter**, **Tab** or none), the minimum number of characters and the timings, then click **Save scanner settings**. Test in **Scanner test**.
- **Customer display**: **Open customer display** opens a second window to place on the screen facing the customer (see [The customer display](topic:customer-display)).

These settings are kept in the till's browser: set them on each till. The page also lists the **Supported devices**.
