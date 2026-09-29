---
id: review-queue
title: La cola de revisión
category: Ventas y gastos
order: 607
routes: [/admin/review]
keywords: [cola de revisión, caso, por revisar, sin conexión, fuera de línea, sin existencias, cerrar caso, resuelto, descartar]
related: [offline-sync, devices, inventory-adjust]
---
La **Cola de revisión** lista las ventas aceptadas sin conexión que deben revisarse. La venta ya está registrada: se corrige la causa y luego se cierra el caso con una nota.

![La cola de revisión](shot:admin-review)

| Tipo de caso | Qué pasó | Qué hacer |
| --- | --- | --- |
| Vendido sin conexión por encima de las existencias | La caja vendió más de lo que había en existencias | Contar el estante, ajustar las existencias y luego cerrar |
| Descuento o precio sin conexión no aprobado | Descuento o precio cambiado sin conexión sin el permiso | Verificar con el cajero y luego cerrar |
| Enviada después del cierre de su turno de caja | La venta no está en el conteo | Verificar el dinero del turno y luego cerrar |
| Vendida sin conexión sin turno de caja abierto | No había ningún turno abierto | Asignar el dinero al turno correcto |
| Vendido sin conexión fuera de la autorización de la caja | Venta hecha después del fin de la autorización sin conexión | Verificar la caja y la venta |
| Caja reportada como perdida | Un equipo perdido tenía ventas sin enviar | Estimar las ventas perdidas y luego cerrar |

1. En el menú, haga clic en **Cola de revisión**.
2. Mantenga el filtro **Abierto** para ver los casos por atender; elija un tipo si hace falta.
3. Haga clic en el número de venta para abrir la venta. Para un problema de existencias, haga clic en **Abrir inventario**.
4. Haga clic en **Cerrar caso** y escriba en **Nota** lo que se verificó (obligatorio).
5. Haga clic en **Marcar como resuelto** o en **Descartar (nada que hacer)**.

> **Consejo:** cada tipo lo atiende quien tiene el permiso: las existencias, quien ajusta el inventario; la caja, quien gestiona los turnos. Revise la cola todos los días.
