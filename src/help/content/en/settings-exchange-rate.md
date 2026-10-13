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

## When the store works in gourdes

The rates are always written with the store's currency first:

| Store currency | The rate is written | Paying in the other currency |
| --- | --- | --- |
| Dollars (USD) | 1 USD = 135 HTG | A customer paying in HTG: **sell rate**. Change given in HTG: **buy rate**. |
| Gourdes (HTG) | 135 HTG = 1 USD | A customer paying in USD: **buy rate**. Change given in USD: **sell rate**. |

The names do not change: the sell rate turns gourdes into dollars, the buy rate turns dollars into gourdes. In a gourde store, a customer who pays 10 USD at a buy rate of 130 HTG = 1 USD has paid 1,300 HTG.

## Change the rates

1. On the **Exchange rates** card, click **Update rate**.
2. Type the **Sell rate** and the **Buy rate**, for example 135 and 130: the number of gourdes for one dollar, whatever the store's currency. Leave one empty to use the same rate for both.
3. To accept another currency, click **Another currency** (or **Add a currency** if only one currency is accepted).
4. Click **Save rates** (or **Cancel**).

New rates apply to new sales right away. Sales already made keep their rates; a return follows the rate of the original sale.

> **Warning:** check the rates every morning before opening the tills. A wrong rate makes the amounts asked and the change given in HTG wrong.

> **Tip:** **History** shows past sell and buy rates, with the date and who changed them.
