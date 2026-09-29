---
id: faq-hardware
title: "Preguntas frecuentes: impresora y cajón"
category: Preguntas frecuentes
order: 1605
routes: [/admin/hardware]
keywords: [impresora no responde, no imprime, sin recibo, cajón no abre, gaveta, puente de impresión, papel, escáner no funciona, lector de códigos]
related: [hardware, settings-payment-methods]
---
## La impresora no responde

Abra **Administración** > **Hardware** y lea el **Estado** del puente de impresión:

- **Detenido**: el puente no está en ejecución en esta PC. Inícielo o reinicie la PC.
- **En ejecución, no vinculado a este navegador**: escriba el código de vinculación que muestra el puente y luego **Vincular**.
- **Vinculado**: verifique que la impresora esté encendida, tenga papel y esté bien conectada.

Luego haga clic en **Imprimir un recibo de prueba**. Mientras tanto, los recibos se imprimen con la ventana de impresión del navegador.

## El cajón de efectivo no se abre

El cajón se abre a través de la impresora de recibos: primero revise la impresora. Solo se abre para los pagos configurados con **Abre el cajón de efectivo** en [Métodos de pago](topic:settings-payment-methods). Para probarlo, use **Probar apertura del cajón** en **Hardware**: haga clic una sola vez, la apertura nunca se repite automáticamente.

## El lector de códigos de barras agrega artículos equivocados

Ajuste el sufijo y la cantidad mínima de caracteres en **Hardware** > **Lector de códigos de barras** y luego verifique en **Prueba del escáner** que el código leído esté completo.
