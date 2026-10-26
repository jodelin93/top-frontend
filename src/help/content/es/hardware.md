---
id: hardware
title: "Hardware: impresora, cajón de efectivo y lector"
category: Hardware y sistema
order: 1401
routes: [/admin/hardware]
keywords: [JodaPrint, agente de impresión, impresora USB, hardware, equipo, impresora, impresora térmica, impresora de etiquetas, etiquetas, puente de impresión, código de vinculación, cajón de efectivo, gaveta, lector de códigos de barras, escáner, pantalla del cliente]
related: [faq-hardware, customer-display, settings-receipts]
---
Los recibos se imprimen directamente en la impresora térmica gracias a **JodaPrint**, un pequeño programa instalado en la computadora de la caja. Funciona con impresoras USB y de red y abre el cajón de efectivo. Sin él, los recibos pasan por el cuadro de impresión del navegador. La página **Hardware** requiere el permiso de gestionar el hardware (propietario, administrador, gerente).

![La página Hardware](shot:admin-hardware)

## Imprimir con JodaPrint

El agente JodaPrint se instala y se activa una vez en cada computadora de caja. Después:

1. En la administración, haga clic en **Hardware**.
2. En **Impresora de recibos (JodaPrint)**, verifique el estado **Conectado · versión …**.
3. Elija la impresora de recibos en la lista y su **Ancho del papel** (80 mm o 58 mm). La impresora con el alias «receipt» en el panel de JodaPrint se elige por defecto.
4. Haga clic en **Imprimir un recibo de prueba**.

| Estado | Significado |
| --- | --- |
| Conectado · versión … | Todo funciona: los recibos salen sin el cuadro de impresión. |
| No encontrado en esta computadora | El agente no está instalado o no está iniciado. Haga clic en **Descargar JodaPrint**, instálelo y luego **Actualizar**. |
| Instalado, sin activar | Active el agente con su cuenta de JodaPrint. |
| Rechazado por el agente | La dirección de la caja no está permitida: agréguela en el panel de JodaPrint (**Developers › Origins & security**). |
| No configurado en el servidor del POS | El técnico debe agregar la clave de firma de JodaPrint en el servidor. |

> **Atención:** sin conexión a Internet la caja no puede hacer firmar la impresión: los recibos pasan entonces por el cuadro de impresión del navegador, y el cajón se abre con su llave.

> **Consejo:** la impresora y el ancho del papel se guardan en el navegador de la caja: elíjalos en cada caja.

## Impresora de etiquetas

Las etiquetas de productos (1 × 1 pulgada) se imprimen en una impresora de etiquetas gracias a JodaPrint, sin la ventana de impresión del navegador.

1. En el panel de JodaPrint, dé el alias **label** a la impresora de etiquetas. Así se elige por defecto.
2. En la página **Hardware**, en **Impresora de etiquetas**, verifique que esté elegida la impresora correcta, o elíjala en la lista.
3. Cargue un rollo de etiquetas de 1 × 1 pulgada y haga clic en **Imprimir una etiqueta de prueba**.

Las etiquetas se imprimen desde la lista de productos: vea [La lista de productos y las etiquetas](topic:products-list).

> **Consejo:** la impresora de etiquetas se elige en cada computadora. Hágalo una vez en cada computadora que imprima etiquetas.

## Método anterior: el puente de impresión

El **puente de impresión** es la forma anterior de imprimir, solo para impresoras de red. Las cajas que usan JodaPrint no lo necesitan.

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

> **Consejo:** después de varios códigos incorrectos, el puente muestra un código nuevo. Después de 10 errores desde la misma página, esa página ya no puede vincularse (el POS sí); después de 50 errores en total, hay que reiniciar el puente en modo de vinculación.

## Cajón, lector y pantalla del cliente

- **Cajón de efectivo**: **Probar apertura del cajón** envía un solo impulso. Verifique que nadie esté parado delante.
- **Lector de códigos de barras**: ajuste el sufijo (**Enter**, **Tabulador** o nada), la cantidad mínima de caracteres y los tiempos de espera, y luego haga clic en **Guardar configuración del escáner**. Pruebe en **Prueba del escáner**.
- **Pantalla del cliente**: **Abrir pantalla del cliente** abre una segunda ventana para colocar en la pantalla orientada hacia el cliente (vea [La pantalla del cliente](topic:customer-display)).

Estos ajustes se guardan en el navegador de la caja: hágalos en cada caja. La página también lista los **Dispositivos compatibles**.
