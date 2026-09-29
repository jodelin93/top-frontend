---
id: pos-group-pricing
title: Precios y descuento de grupo del cliente
category: Caja
order: 208
routes: [/pos]
keywords: [grupo, descuento de grupo, lista de precios, mayorista, VIP, miembro, precio de grupo, tarifa]
related: [customers-groups, price-lists, pos-customer, pos-discounts]
---
Un cliente puede pertenecer a un **Grupo** (por ejemplo, Mayoristas o VIP). El grupo puede tener una **Lista de precios predeterminada** y un **Descuento %** (vea [Grupos de clientes](topic:customers-groups)).

En la caja, todo es automático:

1. [Elija el cliente](topic:pos-customer) (F4).
2. El carrito se recalcula con los precios de la lista del grupo. Un mensaje lo confirma, por ejemplo «Grupo Mayoristas: se aplican los precios del grupo y un descuento de grupo del 5%.»
3. El descuento aparece en los totales en la línea **Descuento de grupo (Mayoristas, 5%)** y luego en el recibo.

No se pide ninguna aprobación: la tienda decidió estos precios para ese grupo. No hay que elegir una lista de precios a mano.

> **Consejo:** quitar el cliente (volver al cliente ocasional) vuelve a poner de inmediato los precios normales.

> **Atención:** un carrito cargado desde una cotización conserva los precios negociados de la cotización (vea [Cotizaciones](topic:estimates)).

> **Consejo:** los productos que no están en la lista del grupo conservan su precio normal; el descuento % del grupo se les aplica de todos modos.
