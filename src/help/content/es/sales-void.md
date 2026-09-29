---
id: sales-void
title: Anular una venta
category: Devoluciones y anulaciones
order: 405
routes: [/admin/sales]
keywords: [anular, anulación, venta anulada, cancelar venta, error de captura, void, eliminar una venta, borrar venta]
related: [returns-pos, sales-history, faq-sales]
---
La anulación corrige una venta registrada por error: las existencias se reintegran, los puntos ganados se retiran y los pagos se anulan. Se hace en la administración.

1. Abra **Administración** > **Ventas**.
2. Busque la venta por su número y haga clic en ella.
3. Haga clic en **Anular venta**.
4. Lea la advertencia: la acción es irreversible.
5. Escriba el **Motivo**, por ejemplo «Registrada por error».
6. Haga clic en el botón rojo **Anular venta**. Para desistir, haga clic en **Conservar la venta**.

![La confirmación de anulación](shot:sale-void)

La venta pasa al estado **Anulada**. Los pagos a cuenta, con tarjeta de regalo o con crédito en tienda se devuelven al cliente; una tarjeta de regalo vendida en esa venta se anula.

| Situación | ¿Se puede anular? | Qué hacer |
| --- | --- | --- |
| Venta **Completada**, turno de caja todavía abierto | Sí | Anule la venta. |
| El turno de la venta está cerrado | No | Haga una [devolución](topic:returns-pos). |
| La venta ya tuvo una devolución o un reembolso | No (el botón ya no aparece) | Haga una devolución por el resto. |
| Venta sin turno, hecha hace más de 24 horas | No | Haga una devolución. |
| Venta pagada con una terminal de tarjetas conectada | No | Haga una devolución para reembolsar la tarjeta. |

Si la anulación es rechazada, el motivo aparece en rojo debajo del campo **Motivo**.

> **Consejo:** sin el permiso de anular, se abre la ventana **Se requiere la aprobación de un gerente**: un gerente autoriza la anulación con sus credenciales.
