---
id: pos-payment-card
title: Pagar con tarjeta, MonCash o transferencia
category: Caja
order: 213
routes: [/pos]
keywords: [tarjeta, tarjeta bancaria, tarjeta de crédito, tarjeta de débito, terminal, datáfono, POS, MonCash, pago móvil, transferencia, referencia, código de autorización]
related: [pos-payment, card-settlements, settings-payment-methods]
---
1. Haga clic en **Card**, **MonCash** o **Bank transfer**.
2. Verifique el monto (estos medios toman el monto exacto).
3. Si aparece el campo **Referencia**, escriba el código de autorización del terminal o el número de transacción de MonCash.
4. Haga clic en **Agregar** y luego en **Completar venta**.

> **Atención:** verifique siempre en el teléfono del cliente o en el terminal que el pago fue aceptado antes de hacer clic en **Agregar**. Sin referencia, la aplicación rechaza el pago («MonCash requiere una referencia»).

## Con un terminal de tarjetas conectado

Si la tienda conectó un terminal de pago, usted no escribe ningún código: la tarjeta se cobra cuando completa la venta. La ventana **Pago con tarjeta** sigue la operación:

- espere a que el cliente presente su tarjeta;
- si la respuesta tarda, haga clic en **Verificar ahora**;
- en caso de fallo, haga clic en **Reintentar** o elija **Cancelar venta**.

Si el cliente cancela en el terminal, la venta no se registra pero el carrito se conserva: tome otro pago.

> **Consejo:** los pagos con tarjeta se concilian después con los estados de cuenta del banco en [Liquidaciones de tarjeta](topic:card-settlements).
