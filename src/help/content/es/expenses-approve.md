---
id: expenses-approve
title: Aprobar, rechazar y pagar un gasto
category: Ventas y gastos
order: 605
routes: [/admin/expenses]
keywords: [aprobar, rechazar, gasto enviado, pagar, marcar como pagado, segunda persona, aprobación, umbral, límite]
related: [expenses-create, approvals, shifts-cash-movements]
---
Estados de un gasto: **borrador**, **enviado**, **aprobado**, **rechazado**, **pagado**.

## Aprobar o rechazar

1. La persona encargada de las aprobaciones (gerente o contador) abre **Gastos** y ubica las filas **enviado**.
2. Hace clic en **Aprobar**, o en **Rechazar** indicando el **Motivo**.

> **Atención:** un gasto debe ser aprobado por una persona distinta de la que lo registró o envió, aunque se trate del propietario. Si es su gasto, haga clic de todos modos en **Aprobar**: se abre la ventana **Se requiere la aprobación de un gerente** y otra persona autorizada escribe allí su **Correo electrónico del gerente**, su **Contraseña** (y su código de dos factores si hace falta) y luego hace clic en **Aprobar**. Es ella quien queda registrada como aprobadora.


Un gasto rechazado puede ser editado y enviado de nuevo por la persona que lo registró.

## Pagar

1. En la fila del gasto **aprobado**, haga clic en **Pagar**.
2. En **Pagado desde la caja**, elija la caja de la que sale el dinero, o **Fuera de caja (caja chica)**.
3. Escriba una **Referencia del pago (opcional)**.
4. Haga clic en **Marcar como pagado**. El gasto pasa al estado **pagado**.

> **Atención:** el efectivo pagado desde una caja se registra como una salida en el turno abierto de esa caja; sin turno abierto, el pago se rechaza. La salida aparecerá en el conteo de cierre del turno.
