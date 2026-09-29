---
id: devices
title: Los dispositivos (cajas registradas)
category: Hardware y sistema
order: 1402
routes: [/admin/devices]
keywords: [dispositivos, equipos, cajas, terminales, sincronización, permiso sin conexión, revocar, marcar como perdido, robado, renombrar, importar ventas no sincronizadas]
related: [offline-sync, offline-mode, review-queue, settings-security]
---
Cada navegador que abre la caja se registra como un **Dispositivo**. La página **Dispositivos** (propietario, administrador) muestra su estado.

![La página Dispositivos](shot:admin-devices)

1. Arriba hay tres contadores: **Dispositivos activos**, **Ventas sin conexión en espera** y **Dispositivos que requieren atención**.
2. **Estado de sincronización** indica, por caja, las ventas no sincronizadas, los reintentos, las ventas por verificar y los casos por revisar.
3. Haga clic en **Actualizar** para poner las cifras al día.

Más abajo, cada dispositivo muestra su **Estado**, su **Última actividad**, su **Última sincronización**, sus ventas **En espera** y la fecha **Sin conexión hasta** (fin de su autorización para vender sin Internet). **Vencido** significa que la caja no se ha conectado desde hace demasiado tiempo; cada reconexión renueva la autorización.

> **Consejo:** un monto aún no enviado distinto de 0 significa que una caja guarda ventas sin conexión. Vuelva a conectarla lo antes posible.

## Importar ventas no sincronizadas

Si una caja ya no puede conectarse, un gerente exporta sus ventas desde la caja (ventana **Ventas sin conexión**, **Exportar ventas no sincronizadas**).

1. Haga clic en **Importar ventas no sincronizadas**.
2. Elija el archivo exportado y la caja de origen en **Caja de la que provienen las ventas**.
3. Haga clic en **Importar**. Un resumen indica las ventas registradas, ya recibidas, por verificar y por reintentar.

## Renombrar, revocar, marcar como perdido

| Botón | Cuándo | Efecto |
| --- | --- | --- |
| **Renombrar** | Dar un nombre claro («Caja 1 - mostrador») | Ningún otro efecto. |
| **Revocar** | Una caja ya no debe vender sin conexión (computadora reemplazada, duda) | Pierde ese permiso de inmediato; las personas con sesión iniciada en ella se desconectan. **Restablecer** anula la revocación. |
| **Marcar como perdido** | Computadora o tableta robada, perdida o abandonada | Revocación definitiva, sesiones cerradas, ventas no enviadas rechazadas; se abre un caso «Caja marcada como perdida» en la [Cola de revisión](topic:review-queue). |

> **Atención:** **Marcar como perdido** no se puede deshacer. Antes, compruebe si quedan ventas no enviadas e intente exportarlas.
