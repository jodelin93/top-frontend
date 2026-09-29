---
id: pos-group-pricing
title: Customer group prices and discount
category: Till
order: 208
routes: [/pos]
keywords: [group, group discount, price list, wholesale, wholesaler, VIP, member, group price, pricing, tier]
related: [customers-groups, price-lists, pos-customer, pos-discounts]
---
A customer can belong to a **Group** (for example Wholesalers or VIP). The group can have a **Default price list** and a **Discount %** (see [Customer groups](topic:customers-groups)).

At the till, everything is automatic:

1. [Choose the customer](topic:pos-customer) (F4).
2. The cart is recalculated with the prices from the group's list. A message confirms it, for example "Group Wholesalers: group prices and a 5% group discount apply."
3. The discount appears in the totals on the **Group discount (Wholesalers, 5%)** line, then on the receipt.

No approval is asked for: the store decided these prices for this group. There is no price list to choose by hand.

> **Tip:** removing the customer (going back to walk-in) restores normal prices right away.

> **Warning:** a cart loaded from an estimate keeps the estimate's negotiated prices (see [Estimates](topic:estimates)).

> **Tip:** products not on the group's list keep their normal price; the group's discount % still applies to them.
