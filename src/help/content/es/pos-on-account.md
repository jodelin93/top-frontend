---
id: pos-on-account
title: Venta a crédito (a cuenta) y crédito en tienda del cliente
category: Caja
order: 216
routes: [/pos]
keywords: [crédito, fiado, a cuenta, cuenta del cliente, límite de crédito, crédito en tienda, nota de crédito, saldo a favor, store credit, crédito bloqueado]
related: [customers-accounts, pos-customer, returns-pos, approvals]
---
## Vender a cuenta

La venta **A cuenta** se carga a la cuenta del cliente, que pagará más tarde. Está reservada a los clientes que tienen una cuenta y un límite de crédito.

1. [Elija el cliente](topic:pos-customer) antes de cobrar.
2. En **Pago**, haga clic en **A cuenta**.
3. Aparece el mensaje «Cargado a la cuenta de …». Verifique el monto y luego haga clic en **Agregar**.
4. Haga clic en **Completar venta**.


> **Atención:** el cajero debe obtener la aprobación de un gerente para una venta a cuenta. Por encima del límite de crédito, se necesita una autorización adicional. Un cliente con **Crédito bloqueado** ya no puede comprar a cuenta.

> **Consejo:** sin cliente elegido, el botón **A cuenta** muestra **Primero agregue un cliente**.

## Pagar con el crédito en tienda del cliente

El crédito en tienda es un saldo a favor que guarda la tienda, por ejemplo después de una [devolución reembolsada en crédito en tienda](topic:returns-pos).

1. Elija el cliente.
2. En **Pago**, haga clic en **Crédito en tienda**: el botón muestra el monto disponible.
3. Haga clic en **Agregar** y luego complete con otro pago si hace falta.

> **Consejo:** el botón **Crédito en tienda** solo aparece si el cliente elegido tiene crédito en tienda. Los dos modos requieren conexión.

Los saldos y abonos se siguen en [Cuentas de clientes](topic:customers-accounts).
