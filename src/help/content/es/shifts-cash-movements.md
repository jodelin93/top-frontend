---
id: shifts-cash-movements
title: Entradas, salidas, depósitos a caja fuerte y apertura del cajón
category: Turnos de caja
order: 302
routes: [/pos]
keywords: [entrada de efectivo, salida de efectivo, depósito a caja fuerte, caja fuerte, cajón, abrir el cajón, sin venta, movimiento, caja chica, sencillo, cambio]
related: [shifts-open, shifts-close, approvals]
---
Todo movimiento de efectivo que no sea una venta debe registrarse; de lo contrario, el cajón no cuadrará al cierre.

## Consultar el turno en curso

Haga clic en el botón del turno (por ejemplo **SH-000004 · Abierto**). La ventana **Turno y cajón de efectivo** muestra el cálculo del cajón:

![El turno en curso](shot:shift-panel)

| Línea | Significado |
| --- | --- |
| **Fondo de caja** | Monto contado en la apertura. |
| **Ventas en efectivo (neto de cambio)** | Efectivo cobrado, menos el cambio entregado. |
| **Entrada de efectivo** | Efectivo agregado durante el día. |
| **Salida de efectivo** | Efectivo retirado para un gasto pequeño. |
| **Depósitos a caja fuerte** | Efectivo transferido del cajón a la caja fuerte. |
| **Pagos de gastos** | Gastos pagados con el dinero del cajón. |
| **Esperado en el cajón** | Lo que debería haber en el cajón en este momento. |

## Registrar un movimiento

1. En la ventana del turno, haga clic en **Entrada de efectivo**, **Salida de efectivo** o **Depósito a caja fuerte**.
2. Escriba el **Monto** y el **Motivo** (al menos 2 caracteres).
3. Si tiene un número de bolsa o de recibo, escríbalo en **Referencia (opcional)**.
4. Haga clic en **Registrar**.

> **Atención:** el cajero no tiene permiso para hacer estos movimientos solo: la ventana **Se requiere la aprobación de un gerente** se abre después de **Registrar**. El gerente escribe sus credenciales y hace clic en **Aprobar** (vea [Pedir la aprobación de un responsable](topic:approvals)).

## Abrir el cajón sin venta

Para darle cambio a un cliente, por ejemplo. Cada apertura se registra con su nombre y un motivo.

1. Haga clic en **Abrir cajón** en la barra superior (en el teléfono: **⋯** y luego **Abrir cajón**).
2. Escriba el **Motivo**, por ejemplo «Cambio para un cliente».
3. Haga clic en **Registrar y abrir**, lea el mensaje y haga clic en **Listo**.

- **Registrado. El cajón está abierto.**: el cajón conectado se abrió.
- **Registrado. No hay hardware conectado: abra el cajón con su llave.**: no hay ningún cajón conectado a este puesto.

> **Consejo:** el botón **Abrir cajón** solo aparece cuando el turno está abierto. Si el cajón no respondió, la apertura se registra de todos modos.
