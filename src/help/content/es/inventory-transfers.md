---
id: inventory-transfers
title: Transferir existencias entre ubicaciones
category: Inventario
order: 904
routes: [/admin/inventory?tab=transfers, /admin/inventory]
keywords: [transferencia, transferir, traslado, mover, despachar, enviar, recibir, en tránsito, faltante, almacén, sucursal, aprobación]
related: [inventory-stock, settings-warehouses, approvals]
---
Una transferencia mueve existencias de una ubicación a otra (del almacén a una sucursal, por ejemplo). Pasa por tres etapas: borrador, despacho, recepción.

![La pestaña Transferencias](shot:inventory-transfers)

## Crear la transferencia

1. Haga clic en la pestaña **Transferencias** y luego en **Nueva transferencia**.
2. Elija la ubicación de **Origen** y la ubicación de **Destino**.
3. Agregue los productos y escriba la **Cantidad** de cada uno, con **Notas** si hace falta.
4. Haga clic en **Guardar borrador**.

> **Consejo:** un borrador no mueve las existencias. Todavía puede **Editar** o cancelarlo (**Cancelar transferencia**).

## Despachar

1. Haga clic en la fila de la transferencia para abrirla.
2. Si aparece el botón **Enviar para aprobación**, haga clic en él y espere a que un gerente haga clic en **Aprobar**.
3. Haga clic en **Despachar...** y escriba en **Ahora** las unidades que salen.
4. Marque **Este es el último despacho** si el resto nunca se enviará.
5. Haga clic en **Despachar**. Las unidades salen del origen y pasan a **En tránsito**.

## Recibir en el destino

1. A la llegada, abra la transferencia y haga clic en **Recibir...**.
2. Escriba las cantidades llegadas en **Buen estado**, **Dañado** y **Faltante**.
3. Haga clic en **Recibir**. La transferencia pasa al estado **Recibido**; su **Historial** guarda cada etapa.

> **Atención:** las unidades faltantes siguen en tránsito hasta que se encuentren. Si se perdieron, haga clic en **Dar de baja faltantes** e indique el motivo.

> **Atención:** en **Configuración de transferencias**, el gerente elige cuándo una transferencia debe aprobarse antes del despacho: **Nunca**, **Por encima de un valor** o **Siempre**. La persona que pidió la transferencia no puede aprobarla ella misma. La **Tolerancia de recepción excedente (%)** fija cuántas unidades de más se pueden recibir sin aprobación.
