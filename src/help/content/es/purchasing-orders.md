---
id: purchasing-orders
title: Crear y hacer aprobar una orden de compra
category: Compras
order: 1002
routes: [/admin/purchasing, /admin/purchasing?tab=orders]
keywords: [orden de compra, pedido a proveedor, pedido, compra, enviar, aprobar, umbral, emitida, entrega prevista, imprimir]
related: [purchasing-receive, purchasing-suppliers, approvals]
---
![La pestaña Órdenes de compra](shot:purchasing-orders)

## Crear el borrador

1. En **Órdenes de compra**, haga clic en **Nueva orden**.
2. Elija el **Proveedor** y la ubicación **Entregar en**.
3. Revise la **Entrega prevista** (calculada con el plazo del proveedor; no puede estar en el pasado).
4. Busque cada producto y haga clic en **Agregar**. Escriba la **Cantidad** y el **Costo unitario** y, si hace falta, un descuento (**Desc. %**) o un **Impuesto**.
5. Complete el **Impuesto de la orden**, el **Envío** (gastos de transporte) y la **Referencia del proveedor**.
6. Agregue **Notas (impresas en la orden)**.
7. Haga clic en **Guardar borrador**.

## Enviar y hacer aprobar

1. Abra la orden haciendo clic en su fila y luego haga clic en **Enviar**.
2. Por debajo del umbral de aprobación de la tienda, la orden se aprueba automáticamente. Por encima, pasa a **Requiere aprobación**.

> **Atención:** una orden por encima del umbral debe ser aprobada por una persona distinta de quien la creó, con el permiso **Aprobar órdenes de compra**. Ni siquiera el propietario puede aprobar su propia orden.

Para aprobar: el gerente abre la orden desde su cuenta y hace clic en **Aprobar**; o, si está presente, el creador hace clic en **Aprobar** y el gerente escribe sus credenciales en la ventana **Se requiere la aprobación de un gerente**.

> **Consejo:** **Devolver** regresa la orden a borrador con un motivo. Después de la aprobación, haga clic en **Marcar como emitida** cuando la orden se envíe al proveedor. **Imprimir** genera la orden en PDF o en papel.

> **Consejo:** un pedido está en la moneda del proveedor (por ejemplo HTG). Al recibirlo, los costos en gourdes entran al inventario convertidos a dólares a la tasa de venta.
