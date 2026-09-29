---
id: faq-sales
title: "Preguntas frecuentes: ventas y monedas"
category: Preguntas frecuentes
order: 1604
routes: [/admin/sales]
keywords: [anular una venta, cancelar venta, no se puede anular, tipo de cambio cambió, tasa, recibo antiguo, devolución, moneda, divisa]
related: [sales-void, returns-pos, settings-exchange-rate]
---
## No puedo anular una venta

La anulación requiere el permiso **Anular ventas** (gerente, administrador, propietario); un cajero puede hacerla con la aprobación de un gerente. También se rechaza cuando:

- el turno de caja de la venta ya está cerrado (o, sin turno, la venta tiene más de 24 horas);
- la venta ya tiene una devolución o un reembolso;
- la venta se pagó con una terminal de tarjeta conectada.

En esos casos, haga una [devolución](topic:returns-pos): repone las existencias y reembolsa al cliente dejando un registro limpio.

> **Consejo:** un mensaje de rechazo puede aparecer en inglés, por ejemplo «This sale's shift is closed: use a return instead of a void»: el turno está cerrado, haga una devolución.

## El tipo de cambio cambió

Un gerente actualiza el tipo en la tarjeta **Tipos de cambio** (vea [Tipo de cambio](topic:settings-exchange-rate)). El nuevo tipo se aplica de inmediato a las ventas nuevas. Las ventas ya hechas conservan su tipo: un recibo antiguo nunca cambia, y una devolución sigue el monto de la venta original.

## No veo las ventas de otra sucursal

Probablemente su cuenta esté limitada a ciertas sucursales. Pida a un administrador que modifique su **Acceso a sucursales** en **Usuarios**.
