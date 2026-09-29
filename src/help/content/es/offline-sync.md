---
id: offline-sync
title: Envío de las ventas sin conexión al volver la conexión
category: Sin conexión
order: 502
routes: [/pos]
keywords: [sincronización, sincronizar, envío, ventas pendientes, enviar ahora, OFFLINE, requiere revisión, exportar ventas no sincronizadas]
related: [offline-mode, devices, review-queue]
---
En cuanto vuelve la conexión, la caja envía las ventas por sí sola y luego lo vuelve a intentar con regularidad si quedan algunas. Mientras haya ventas esperando, el indicador muestra su número, por ejemplo **En línea · 1 pendientes**.

1. Haga clic en el indicador **En línea** / **Sin conexión**.
2. La ventana **Ventas sin conexión** lista las ventas que quedaron en el dispositivo, con su número, su hora y su monto.
3. Haga clic en **Enviar ahora** para forzar el envío.

![La ventana Ventas sin conexión](shot:pos-offline-sales)

| Estado mostrado | Significado | Qué hacer |
| --- | --- | --- |
| **Pendientes de envío** | La venta se enviará automáticamente. | Nada. Mantenga el dispositivo encendido y conectado. |
| **Envío pospuesto, próximo intento a las …** | No se pudo contactar con el servidor. | Verifique la conexión. |
| **Requiere revisión** | El servidor rechazó la venta, con el motivo. | Pida a un gerente que corrija la causa y luego haga clic en **Reintentar**. |

Una vez enviadas, las ventas pasan a la lista **Enviadas** con el número provisional y el número definitivo, por ejemplo **OFFLINE-321E10D8 → MAIN-000008**. En **Administración** > **Ventas**, puede buscar una venta por su número sin conexión.

> **Atención:** nunca borre los datos del navegador mientras haya ventas esperando: se perderían. Cerrar sesión, en cambio, conserva las ventas pendientes.

> **Consejo:** si una caja ya no puede conectarse en absoluto, un gerente hace clic en **Exportar ventas no sincronizadas** en esta ventana (se pide aprobación). Un administrador importa el archivo en [Dispositivos](topic:devices).

Las ventas sin conexión que superan las existencias reales o los límites llegan a la [Cola de revisión](topic:review-queue).
