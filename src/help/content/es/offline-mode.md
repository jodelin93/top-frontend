---
id: offline-mode
title: Vender sin conexión
category: Sin conexión
order: 501
routes: [/pos]
keywords: [sin conexión, sin internet, offline, fuera de línea, corte, se cayó el internet, conexión, autorización sin conexión, permiso, suspendida, en pausa, bloqueada, recibo provisional]
related: [offline-sync, settings-security, devices, faq-offline]
---
La caja guarda en el dispositivo una copia de los productos, los precios, los impuestos y las existencias. Si se corta el internet, usted sigue vendiendo: cada venta se guarda en el dispositivo y luego se envía al servidor en cuanto vuelve la conexión.

Para vender sin conexión, la caja debe haber recibido una **autorización sin conexión** mientras estaba en línea. Se renueva automáticamente cuando la caja está conectada y sigue siendo válida durante un tiempo (24 horas por defecto, vea [Sin conexión y seguridad](topic:settings-security)).

## Vender sin internet

Cuando se cae la conexión, el indicador de arriba pasa de **En línea** (verde) a **Sin conexión** (naranja). Una franja puede recordar la hora límite.

![La caja sin conexión](shot:pos-offline)

1. Escanee o busque los productos como de costumbre (la búsqueda por nombre, SKU o código de barras funciona sin conexión).
2. Haga clic en **Cobrar**.
3. Cobre en efectivo, con tarjeta o MonCash, y luego haga clic en **Completar venta**.
4. La ventana **Venta completada** indica «Guardada sin conexión». El recibo lleva un número provisional que empieza por **OFFLINE-**. Entrégueselo al cliente como de costumbre.

## Lo que no funciona sin conexión

| Función | Por qué |
| --- | --- |
| Ventas en espera | Se guardan en el servidor. |
| Tarjetas de regalo (venta y pago) | El servidor verifica el código y el saldo. |
| Puntos, venta a cuenta, crédito en tienda | El servidor verifica el saldo del cliente. |
| Buscar o crear un cliente | La venta continúa como cliente ocasional. |
| Códigos promocionales | El servidor valida el código. |
| Aprobación de un gerente | Pasa por el servidor. |
| Devoluciones y anulaciones | El botón **Devoluciones** está desactivado. |

> **Atención:** sin conexión, la caja no vende más de las existencias que conoce («Solo hay … en existencia en esta caja (sin conexión)»). Un pago en moneda extranjera usa la tasa guardada en la caja.

## Cuando la venta sin conexión está en pausa

Si la caja permanece sin conexión demasiado tiempo, la pantalla se bloquea: **La venta sin conexión está en pausa**. Causas posibles: la autorización venció, la hora del dispositivo retrocedió o la caja fue desactivada. Las ventas ya realizadas siguen seguras. Vuelva a conectarse y luego haga clic en **Reintentar**.

> **Atención:** una caja nueva debe abrirse al menos una vez con internet; de lo contrario, no puede vender sin conexión.
