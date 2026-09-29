---
id: hardware
title: "Hardware: impresora, cajón de efectivo y lector"
category: Hardware y sistema
order: 1401
routes: [/admin/hardware]
keywords: [hardware, equipo, impresora, impresora térmica, puente de impresión, código de vinculación, cajón de efectivo, gaveta, lector de códigos de barras, escáner, pantalla del cliente]
related: [faq-hardware, customer-display, settings-receipts]
---
El **Puente de impresión** es un pequeño programa instalado en la PC de la caja. Envía los recibos a la impresora térmica y abre el cajón de efectivo. Sin él, los recibos pasan por la ventana de impresión del navegador. La página **Hardware** requiere el permiso para administrar el hardware (propietario, administrador, gerente).

![La página Hardware](shot:admin-hardware)

## Vincular el puente de impresión

Su técnico instala el puente una sola vez. Después, en la PC de la caja:

1. Inicie el puente de impresión: su ventana muestra un **Código de vinculación** de 6 dígitos.
2. En la administración, haga clic en **Hardware**.
3. En **Impresora de recibos (puente de impresión)**, escriba el código en **Código de vinculación**.
4. Deje la **Dirección del puente** tal cual (http://127.0.0.1:17777), salvo que el técnico indique otra cosa.
5. Haga clic en **Vincular**. El estado pasa a **Vinculado**.
6. Haga clic en **Imprimir un recibo de prueba**.

| Estado | Significado |
| --- | --- |
| Detenido | El puente no está en ejecución en esta PC. Inícielo. |
| En ejecución, no vinculado a este navegador | Escriba el código de vinculación. |
| Vinculado · versión … | Todo funciona. |

> **Atención:** la vinculación es propia de cada navegador y de cada caja: vuelva a hacerla si cambia de PC o de navegador. **Desvincular** quita la vinculación.

> **Consejo:** después de varios códigos incorrectos, el puente muestra un código nuevo. Después de 10 errores, hay que reiniciarlo en modo de vinculación.

## Cajón, lector y pantalla del cliente

- **Cajón de efectivo**: **Probar apertura del cajón** envía un solo impulso. Verifique que nadie esté parado delante.
- **Lector de códigos de barras**: ajuste el sufijo (**Enter**, **Tabulador** o nada), la cantidad mínima de caracteres y los tiempos de espera, y luego haga clic en **Guardar configuración del escáner**. Pruebe en **Prueba del escáner**.
- **Pantalla del cliente**: **Abrir pantalla del cliente** abre una segunda ventana para colocar en la pantalla orientada hacia el cliente (vea [La pantalla del cliente](topic:customer-display)).

Estos ajustes se guardan en el navegador de la caja: hágalos en cada caja. La página también lista los **Dispositivos compatibles**.
