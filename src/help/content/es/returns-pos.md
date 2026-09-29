---
id: returns-pos
title: Hacer una devolución y reembolsar al cliente
category: Devoluciones y anulaciones
order: 401
routes: [/pos, /admin/returns]
keywords: [devolución, devolver, reembolsar, reembolso, nota de crédito, crédito en tienda, recibo, reintegrar a existencias, dañado, cuarentena, desechar, plazo de devolución]
related: [returns-exchange, returns-goodwill, returns-admin, sales-void]
---
Una **devolución** recibe de vuelta artículos vendidos, incluso días después. Crea una **nota de crédito**; la venta original queda en el historial, marcada como reembolsada. Para una venta registrada por error durante el mismo turno, es mejor la [anulación](topic:sales-void).

> **Atención:** las devoluciones están reservadas a las personas autorizadas a reembolsar (gerente, administrador, propietario por defecto). El cajero no ve el botón **Devoluciones**: debe llamar al gerente. Sin conexión, el botón está desactivado.

## Buscar la venta y elegir los artículos

1. Haga clic en **Devoluciones** en la barra superior (en el teléfono: **⋯** y luego **Devoluciones**).
2. En **Nueva devolución**, escanee el código de barras del recibo o escriba su número, por ejemplo MAIN-000001.
3. Haga clic en **Buscar venta**. La venta se muestra con su cliente y sus pagos.
4. Deje activa la pestaña **Devolución**.
5. Para cada artículo devuelto, escriba la cantidad en **A DEVOLVER** (0 para los demás: es una devolución parcial).
6. En **ESTADO**, elija: **Reintegrar a existencias**, **Dañado: mantener en cuarentena** o **Dañado — desechar**.
7. Complete el **Motivo de la devolución**.

![La ventana Nueva devolución](shot:returns-new)

La columna **REEMBOLSO** calcula el monto por línea, con los descuentos e impuestos originales incluidos.

## Elegir el reembolso

| Opción en «Reembolsar a» | Efecto | Aprobación |
| --- | --- | --- |
| **Pago original (primero tarjeta, luego efectivo)** | Reembolsa con los medios de pago de la venta. | Ninguna. |
| **Crédito en tienda del cliente** | Crea un crédito en tienda utilizable en una próxima compra. | Ninguna. Requiere un cliente en la venta. |
| **Cash**, **Card**, **MonCash**… | Reembolsa con otro medio de pago. | Puede requerir un gerente. |

1. Elija **Reembolsar a** y luego la **Caja** de donde sale el efectivo.
2. Revise el resumen, por ejemplo «2 artículo(s) · reembolso aproximado de USD 2.48».
3. Haga clic en **Reembolsar …**.

> **Atención:** los reembolsos en efectivo se toman del turno abierto de la caja elegida y aparecerán en el conteo. Pasado el plazo de devolución (30 días, por ejemplo), se necesita la aprobación de un gerente. Los artículos vuelven a una ubicación de su sucursal.

## Entregar la nota de crédito

La ventana **Devolución completada** muestra el documento **NOTA DE CRÉDITO**, con su propio número (por ejemplo MAIN-R-000001) y la factura original. Haga clic en **Imprimir nota de crédito**, haga firmar al cliente si hace falta, entregue el dinero y luego haga clic en **Listo**.
