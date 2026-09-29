---
id: inventory-counts
title: Hacer un inventario (conteo)
category: Inventario
order: 905
routes: [/admin/inventory?tab=counts, /admin/inventory]
keywords: [inventario, conteo, contar, conteo a ciegas, diferencia, faltante, sobrante, aprobar, recontar, inventario cíclico, toma física]
related: [inventory-adjust, inventory-stock, approvals]
---
Un conteo compara las existencias reales con las existencias registradas, para toda una ubicación o una sola categoría.

![La pestaña Conteos](shot:inventory-counts)

## Comenzar

1. Haga clic en la pestaña **Conteos** y luego en **Nuevo conteo**.
2. Elija la **Ubicación** y una **Categoría** (o **Todos los productos**).
3. Deje marcado **Conteo a ciegas**: quienes cuentan no ven las cantidades esperadas.
4. Agregue **Notas** y haga clic en **Iniciar conteo**.

> **Consejo:** las cantidades esperadas se congelan al comenzar. Puede seguir vendiendo durante el conteo: esas ventas no cuentan como diferencias.

## Registrar y enviar

1. Abra el conteo (estado **Conteo en curso**).
2. Escriba la cantidad en **Contado** y, si hay diferencia, un **Motivo**. Deje vacía una línea no contada: no se ajustará.
3. Haga clic en **Guardar conteos** para continuar más tarde, o en **Enviar conteo**.

La aplicación muestra las diferencias, las unidades de más o de menos y el valor neto.

> **Atención:** si todas las diferencias quedan dentro de la tolerancia de la tienda, el conteo se registra de inmediato. Si no, pasa a **Requiere aprobación**: una persona distinta de quien contó, con el permiso **Aprobar diferencias de conteo de inventario**, debe validarlo.

## Aprobar (gerente)

1. Abra el conteo en **Requiere aprobación** y revise cada diferencia y su motivo.
2. Haga clic en **Aprobar y registrar** para corregir las existencias, o en **Devolver** para que se vuelva a contar.

**Cancelar conteo** lo detiene sin modificar nada.
