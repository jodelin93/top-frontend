---
id: pos-payment-cash-change
title: Efectivo en dólares o en gourdes y cambio a entregar
category: Caja
order: 212
routes: [/pos]
keywords: [efectivo, cash, cambio, vuelto, vuelta, dar el cambio, a entregar, gourdes, HTG, dólares, USD, tasa, billetes]
related: [pos-payment, settings-exchange-rate, pos-receipt, shifts-close]
---
1. En **El cliente paga en**, elija **USD** o **HTG**.
2. Haga clic en **Cash**.
3. Haga clic en uno de los montos propuestos (monto exacto o billetes redondos), o escriba el monto recibido y luego haga clic en **Agregar**.
4. Aparece el recuadro verde **CAMBIO PARA EL CLIENTE**. Muestra el cambio en USD y en HTG.
5. Toque la moneda en la que entrega el cambio: se muestra en grande.
6. Haga clic en **Completar venta · entregar … de cambio**.

![Pago en efectivo con el cambio a entregar](shot:pos-payment-cash)

Pagar en gourdes muestra la conversión, por ejemplo «= 45,28 US$». Después de la venta, la ventana **Venta completada** recuerda en grande el cambio a entregar (**Recibido**, **Total de la venta**, **Cambio a entregar**), o «Monto exacto: no hay cambio que entregar».

Se aplican dos tasas. El monto pedido en gourdes y el valor de los gourdes recibidos usan la **tasa de venta**. El cambio entregado en gourdes por dólares usa la **tasa de compra**. Si el cliente pagó en gourdes, el cambio en gourdes se calcula directamente (2.000 HTG entregados por 1.350 HTG debidos: se devuelven 650 HTG). Las dos tasas aparecen debajo de los totales, por ejemplo «1 USD = 135 HTG (venta) · 130 HTG (compra)».

> **Atención:** verifique que el cliente pague realmente en la moneda elegida. La tasa utilizada es la del día, fijada en la administración (vea [Tasa de cambio](topic:settings-exchange-rate)). El cambio entregado nunca puede superar el efectivo recibido.

> **Consejo:** el efectivo cobrado (menos el cambio entregado) se suma a su turno de caja y se esperará en el conteo de cierre del turno.
