---
id: settings-exchange-rate
title: The USD / HTG exchange rate
category: Settings
order: 1302
routes: [/admin/settings, /admin/dashboard]
keywords: [sell rate, buy rate, exchange rate, rate, currency, dollar, gourde, USD, HTG, conversion, update rate, rate history, foreign currency]
related: [pos-payment-cash-change, dashboard, settings-general]
---
The store has two rates between the dollar and the gourde. The **Exchange rates** card is at the top of the **Dashboard** and on the **General** tab of the settings. It shows both rates.

![The Exchange rates card](shot:settings-exchange-rate)

| Rate | Used to | Example |
| --- | --- | --- |
| **Sell rate** | Turn **gourdes into dollars**: a customer paying in HTG (the amount asked and the value received), a paid-in or a variance in HTG. | 1 USD = 135 HTG: a 10 USD item costs 1,350 HTG. |
| **Buy rate** | Turn **dollars into gourdes**: change given in HTG when the customer paid in dollars. | 1 USD = 130 HTG: 10 USD of change is 1,300 HTG. |

When the customer pays in gourdes and gets change in gourdes, the change is worked out directly in gourdes, with no rate spread: 2,000 HTG given for 1,350 HTG due gives back 650 HTG.

## Change the rates

1. On the **Exchange rates** card, click **Update rate**.
2. Type the **Sell rate** and the **Buy rate**, for example 135 and 130. Leave the buy rate empty to use the sell rate.
3. To accept another currency, click **Another currency** (or **Add a currency** if only one currency is accepted).
4. Click **Save rates** (or **Cancel**).

New rates apply to new sales right away. Sales already made keep their rates; a return follows the rate of the original sale.

> **Warning:** check the rates every morning before opening the tills. A wrong rate makes the amounts asked and the change given in HTG wrong.

> **Tip:** **History** shows past sell and buy rates, with the date and who changed them.
