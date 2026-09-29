---
id: sales-history
title: Historial de ventas, reimpresión y envío del recibo
category: Ventas y gastos
order: 602
routes: [/admin/sales]
keywords: [ventas, historial, buscar una venta, reimprimir, copia, recibo, ticket, correo electrónico, email, enlace del recibo, WhatsApp, estado, número de venta, OFFLINE]
related: [sales-void, returns-pos, pos-receipt]
---
La página **Ventas** lista todas las ventas con el número, la fecha, el cliente, el cajero, el total y el estado.

![El historial de ventas](shot:admin-sales)

1. En el menú, haga clic en **Ventas**.
2. Escriba un número de venta en la búsqueda. Las ventas hechas sin conexión también tienen un número OFFLINE-… que puede buscar.
3. Filtre por estado: **Completada**, **Anulada**, **Pago pendiente**, **En espera**…
4. Elija un período: **Hoy**, **Ayer**, **Últimos 7 días**, **Últimos 30 días**, **Este mes** o **Rango personalizado** (desde ≤ hasta).
5. Use **Anterior** y **Siguiente** para cambiar de página.

> **Consejo:** una venta también puede quedar **Reembolsada** o **Reembolsada parcialmente** después de una devolución. El nombre del vendedor aparece debajo del cajero cuando es distinto.

## Detalle de una venta y reimpresión

1. Haga clic en la fila de la venta (en el teléfono: en su tarjeta).
2. Se muestra el recibo completo: artículos, impuestos, total, pagos y cambio entregado.
3. Para volver a imprimir, haga clic en **Reimprimir (copia)**. El recibo impreso lleva la mención COPIA.

![El detalle de una venta](shot:sale-detail)

Desde este detalle, también puede **Devolver artículos** ([devolución](topic:returns-pos)) o **Anular venta** ([anulación](topic:sales-void)).

## Enviar el recibo al cliente

1. En el detalle de la venta, haga clic en **Enviar recibo por correo**.
2. Escriba la dirección de correo electrónico del cliente.
3. Marque **El cliente pidió recibir este recibo por correo (sin publicidad)**.
4. Haga clic en **Enviar**.

Para SMS o WhatsApp, haga clic en **Enlace del recibo (SMS, WhatsApp)**: la aplicación crea un enlace al recibo, válido por 30 días.

> **Atención:** este envío sirve únicamente para el recibo; no da el consentimiento del cliente para recibir publicidad. Si la dirección no es la del cliente de la venta, sus datos no aparecen en el documento enviado.
