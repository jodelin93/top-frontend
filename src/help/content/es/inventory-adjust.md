---
id: inventory-adjust
title: Corregir las existencias, ver los movimientos y verificar el inventario
category: Inventario
order: 903
routes: [/admin/inventory, /admin/inventory?tab=movements]
keywords: [ajuste, ajustar, corregir, rotura, daño, robo, pérdida, vencido, movimientos, historial, verificar existencias, reconstruir, stock negativo, inventario negativo]
related: [inventory-counts, inventory-stock, review-queue]
---
## Corregir las existencias (ajuste)

Un ajuste corrige las existencias después de una rotura, un robo, un vencimiento o un error de conteo.

1. En la pestaña **Existencias**, haga clic en **Contar / ajustar**.
2. Elija la **Ubicación** y el **Motivo**: **Conteo de inventario (reconteo)**, **Dañado**, **Robo / pérdida**, **Vencido** u **Otro**.
3. Elija el **Modo**: **Fijar la cantidad contada** (se calcula la diferencia) o **Agregar / quitar cantidad** (+5 para agregar, -2 para quitar).
4. Explique el motivo en **Notas**.
5. Agregue los productos, escriba las cantidades y luego haga clic en **Guardar ajuste**.

![La ventana Contar / ajustar](shot:inventory-adjust)

> **Atención:** las existencias nunca pueden quedar en negativo. Si quita más de lo que hay en existencia, el ajuste se rechaza y se indica la cantidad disponible. Esta regla también se aplica a las ventas, las transferencias y la importación.

> **Consejo:** los ajustes requieren el permiso **Ajustar existencias**. Cada uno recibe un número (ADJ-…) visible en la pestaña **Movimientos**.

## Consultar los movimientos

La pestaña **Movimientos** muestra los últimos 200 movimientos: ventas, devoluciones, recepciones, transferencias, ajustes y conteos. Filtre por ubicación; cada fila indica el **Tipo**, la **Cantidad** (+ entrada, − salida), la **Referencia** y las **Notas**. Este historial es la referencia oficial.

## Verificar y reconstruir las existencias

1. En **Movimientos**, haga clic en **Verificar existencias**.
2. Elija el **Alcance**: **Toda la tienda** o una ubicación.
3. Haga clic en **Verificar (simulación)**: no se modifica nada.
4. Si todo está bien: **Todo coincide con el historial. No hay nada que corregir.**
5. Si no, revise las diferencias y luego haga clic en **Aplicar correcciones**.

> **Atención:** **Aplicar correcciones** reemplaza las cantidades guardadas por las del historial. Reserve esta acción al gerente o al administrador.
