---
id: purchasing-invoices
title: Registrar una factura de proveedor
category: Compras
order: 1004
routes: [/admin/purchasing?tab=invoices, /admin/purchasing]
keywords: [factura de proveedor, factura de compra, conciliación de tres vías, diferencia de precio, vencimiento, fecha de vencimiento, saldo inicial, anular factura]
related: [purchasing-payments, purchasing-receive, faq-dates]
---
La factura se compara con la orden de compra y con las cantidades recibidas (conciliación de tres vías).

![La pestaña Facturas](shot:purchasing-invoices)

1. Haga clic en la pestaña **Facturas** y luego en **Nueva factura**.
2. Elija el **Proveedor** y el **Tipo** (**Factura** o **Saldo inicial**).
3. Escriba el **Número de factura del proveedor** y la **Fecha de la factura** (no puede ser futura).
4. Deje la **Fecha de vencimiento** vacía para usar las condiciones del proveedor; si no, no puede ser anterior a la fecha de la factura.
5. Elija la **Orden de compra**: se muestran sus líneas recibidas. Marque las líneas facturadas y revise cantidades y precios.
6. Para cargos fuera de la orden (transporte…), haga clic en **Agregar una línea**.
7. Haga clic en **Guardar factura**.

La ficha de la factura muestra la **Diferencia de precio** y la **Diferencia de cant.** con respecto a la orden, y luego el **Saldo pendiente**.

> **Atención:** una factura sin diferencias (o dentro de la tolerancia) se aprueba de inmediato. Si las supera, queda en **Requiere aprobación**: una persona distinta de quien la registró debe hacer clic en **Aprobar**. Solo se puede pagar una factura aprobada.

> **Consejo:** una factura incorrecta no se elimina: haga clic en **Anular factura** e indique el motivo.
