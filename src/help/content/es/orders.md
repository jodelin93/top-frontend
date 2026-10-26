---
id: orders
title: Seguir los pedidos y sus anticipos
category: Ventas y gastos
order: 608
routes: [/admin/orders]
keywords: [pedidos, anticipo, adelanto, saldo pendiente, retiro, listo, cancelado, reembolsar anticipo, retener anticipo, informe de anticipos]
related: [pos-orders, shifts-admin, reports-overview]
---
La página **Pedidos** lista los servicios preparados para clientes que pagaron un anticipo. Cada pedido muestra su **Total**, los **Anticipos pagados**, el **Saldo pendiente**, la fecha **Listo para el** y su estado: **En preparación**, **Listo**, **Retirado** o **Cancelado**.

1. Elija un estado (por defecto **Esperando al cliente**: en preparación o listo).
2. Busque por número de pedido, nombre o teléfono del cliente.
3. Haga clic en un pedido para ver sus líneas, cada anticipo (fecha, método, quién lo tomó) y su historial.

Desde un pedido puede **Imprimir** el recibo del pedido, **Agregar un anticipo**, **Editar detalles** (fecha de entrega y notas), **Marcar como listo** o **Cancelar el pedido**. El cliente lo retira en caja: **Pedidos** y luego **Retirar: cobrar el saldo**.

## Dónde aparece el dinero

- **Sesión de caja**: un anticipo en efectivo es una entrada de efectivo de la sesión que lo tomó. Cada anticipo aparece en **Anticipos de pedidos** en la sesión y en el informe Z.
- **Informes**: el informe **Anticipos de pedidos** lista cada anticipo y reembolso. **Pagos por método** cuenta los anticipos cuando se pagan.
- **Ventas**: la venta se cuenta al retirar, por el total completo. Su línea **Anticipo pagado** no se vuelve a contar como dinero recibido.

## Cancelar un pedido

Haga clic en **Cancelar el pedido**, escriba el motivo y elija **Devolver los anticipos** o **Retener los anticipos**. Cada anticipo se devuelve como se pagó, en la moneda entregada. Un reembolso en efectivo sale de una sesión abierta en una caja de la sucursal del pedido. Cancelar requiere el permiso «Cancelar pedidos y reembolsar o retener sus anticipos», o la aprobación de un gerente.

> **Nota:** el personal de una sucursal solo ve los pedidos de sus sucursales. Los pedidos son para artículos sin control de inventario (servicios).
