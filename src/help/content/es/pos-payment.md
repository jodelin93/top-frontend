---
id: pos-payment
title: "Cobrar: la pantalla de pago"
category: Caja
order: 211
routes: [/pos]
keywords: [cobrar, pago, pagar, F12, completar venta, finalizar venta, medio de pago, forma de pago, saldo pendiente, moneda, USD, HTG]
related: [pos-payment-cash-change, pos-payment-card, pos-loyalty, pos-gift-cards, pos-on-account, pos-receipt]
---
1. Haga clic en **Cobrar** (tecla **F12**). En el teléfono, toque **Cobrar** en la barra inferior.
2. La ventana **Pago** muestra el **TOTAL**, lo **RECIBIDO** y el **SALDO PENDIENTE**, en dólares y en gourdes.
3. Debajo de estas casillas se recuerda la tasa del día, por ejemplo **1 USD = 132,5 HTG**.

![La ventana Pago](shot:pos-payment)

El principio es siempre el mismo:

1. Elija la moneda en **El cliente paga en**: **USD** o **HTG**.
2. Haga clic en el medio de pago.
3. Verifique o escriba el monto y luego haga clic en **Agregar**.
4. Repita mientras quede un monto por pagar: una venta puede combinar varios medios y varias monedas.
5. Haga clic en **Completar venta**.

| Botón | Medio de pago | Para saber |
| --- | --- | --- |
| **Cash** | Efectivo | Único medio que puede superar el monto adeudado: la diferencia se convierte en el cambio. Vea [Efectivo y cambio](topic:pos-payment-cash-change). |
| **Card** | Tarjeta bancaria | Monto exacto. Vea [Tarjeta, MonCash, transferencia](topic:pos-payment-card). |
| **MonCash** | Pago móvil | Monto exacto. La **Referencia** es obligatoria. |
| **Bank transfer** | Transferencia | Monto exacto. La **Referencia** es obligatoria. |
| **Loyalty points** | [Puntos de fidelidad](topic:pos-loyalty) | Aparece si el cliente tiene puntos. |
| **Tarjeta de regalo** | [Tarjeta de regalo](topic:pos-gift-cards) | Pide el código de la tarjeta. |
| **A cuenta** | [Venta a crédito](topic:pos-on-account) | Requiere un cliente con cuenta. |
| **Crédito en tienda** | [Crédito en tienda](topic:pos-on-account) | Aparece si el cliente tiene crédito en tienda. |

Los nombres de los medios los configura la tienda (vea [Medios de pago](topic:settings-payment-methods)); por eso pueden ser diferentes.

> **Consejo:** para quitar un pago agregado por error, haga clic en su papelera en la lista.

> **Atención:** si la ventana **Se requiere la aprobación de un gerente** se abre después de **Cobrar**, el carrito contiene una acción restringida (precio modificado, descuento grande…). Vea [Pedir la aprobación de un responsable](topic:approvals).

Sin conexión, la ventana muestra en naranja: «Sin conexión — la venta se guardará en este dispositivo y se enviará más tarde.» El efectivo, la tarjeta y MonCash siguen siendo posibles; los puntos, las tarjetas de regalo, las ventas a cuenta y el crédito en tienda requieren conexión.
