---
id: inventory-stock
title: Consultar las existencias y detectar existencias bajas
category: Inventario
order: 901
routes: [/admin/inventory, /admin/inventory?tab=stock]
keywords: [existencias, stock, inventario, ubicación, disponible, reservado, en tránsito, existencias bajas, stock bajo, vendible, cuarentena, almacenista]
related: [inventory-receive, inventory-adjust, purchasing-reorder, notifications]
---
Todas las tareas de inventario se hacen en **Administración** > **Inventario**. Las pestañas son **Existencias**, **Movimientos**, **Conteos**, **Transferencias**, **Antigüedad de saldos** y **Valoración**. El almacenista, el gerente, el administrador y el propietario tienen acceso; un cajero solo consulta las existencias en la caja.

La pestaña **Existencias** muestra, para cada producto y cada ubicación, las cantidades **En existencia**, **Reservado**, **Disponible** y **En tránsito**, con las fechas del **Último conteo** y de la **Última recepción**.

![La pestaña Existencias](shot:inventory-stock)

1. Escriba un nombre, un SKU o un código de barras en la búsqueda.
2. Elija una ubicación en **Todas las ubicaciones** para ver una sola tienda o un solo almacén.
3. Marque **Solo vendibles** para ocultar las ubicaciones no vendibles (cuarentena, dañado).

> **Consejo:** solo se pueden vender las existencias de una ubicación vendible. Las existencias en cuarentena o dañadas se guardan aparte y llevan una etiqueta amarilla.

## Detectar existencias bajas

Un producto tiene existencias bajas cuando su cantidad llega a su **Existencia mínima** (ficha del producto) o baja de ella.

1. Marque **Solo existencias bajas**. Las filas afectadas llevan la etiqueta roja **Bajo**.
2. Pida esos productos (vea [Reabastecimiento](topic:purchasing-reorder)).

> **Consejo:** la aplicación revisa las existencias con regularidad y envía una alerta a la campana por cada ubicación con existencias bajas. La alerta desaparece cuando se reponen las existencias.
