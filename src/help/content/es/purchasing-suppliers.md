---
id: purchasing-suppliers
title: Gestionar los proveedores
category: Compras
order: 1001
routes: [/admin/purchasing?tab=suppliers, /admin/purchasing]
keywords: [proveedor, contacto, condiciones de pago, plazo de entrega, moneda, productos del proveedor, preferido, bloqueado]
related: [purchasing-orders, purchasing-reorder]
---
Todo el ciclo de compras se hace en **Administración** > **Compras**. Las pestañas visibles dependen de sus permisos: **Órdenes de compra**, **Proveedores**, **Reorden**, **Devoluciones a proveedores** (encargado de almacén, gerente…); **Facturas**, **Pagos**, **Cuentas por pagar** (gerente, administrador, propietario).

La pestaña **Proveedores** lista sus proveedores con su contacto, sus condiciones de pago, su moneda y su estado.

![La pestaña Proveedores](shot:purchasing-suppliers)

1. Haga clic en **Nuevo proveedor**.
2. Escriba el **Código** y el **Nombre**, y luego el **Correo electrónico**, el **Teléfono** y el **Número de identificación fiscal**.
3. Indique las **Condiciones de pago (días netos)**, por ejemplo 30.
4. Indique el **Plazo de entrega (días)**: fija la fecha prevista de las nuevas órdenes.
5. Escriba la **Moneda** (USD, HTG…); vacía = moneda de la tienda.
6. Complete la **Dirección**, la **Ciudad** y los **Contactos** (**Agregar contacto**).
7. Haga clic en **Guardar proveedor**.

> **Atención:** un proveedor **Inactivo** o **Bloqueado** ya no puede recibir nuevas órdenes de compra.

> **Consejo:** el botón **Productos** de un proveedor registra, para cada producto, el código del proveedor, el último costo, la cantidad mínima de pedido y si es el proveedor **Preferido**. Esta información se usa para la [reposición](topic:purchasing-reorder).
