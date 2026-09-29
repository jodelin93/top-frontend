---
id: price-lists
title: Las listas de precios
category: Catálogo
order: 807
routes: [/admin/price-lists]
keywords: [lista de precios, tarifa, precio promocional, oferta, precio mayorista, mayoreo, miembro, prioridad, vigencia, validez, cantidad mínima]
related: [customers-groups, pos-group-pricing, tax-categories, discounts-admin]
---
Una lista de precios reemplaza el precio base de algunos productos. La página **Listas de precios e impuestos** las reúne.

![La página Listas de precios e impuestos](shot:admin-price-lists)

| Tipo | Aplicación |
| --- | --- |
| **Estándar** | Se aplica automáticamente en la caja cuando está activa. |
| **Promocional** | Se aplica automáticamente, por lo general durante un tiempo limitado (rebajas). |
| **Mayoreo** | Para los clientes de un grupo que la tiene como lista predeterminada. |
| **Miembro** | Para los clientes de un grupo que la tiene como lista predeterminada. |

## Crear una lista

1. Haga clic en **Nueva lista de precios**.
2. Ingrese el **Nombre** y el **Código**.
3. Elija el **Tipo**, la **Moneda** y la **Sucursal** (o **Todas las sucursales**).
4. Ajuste la **Prioridad**: la más alta prevalece si se aplican varias listas.
5. Indique **Válido desde** y **Válido hasta** (déjelos vacíos para empezar de inmediato o sin fecha de fin).
6. Haga clic en **Crear lista de precios**.

> **Atención:** la fecha de fin debe ser posterior a la fecha de inicio («Debe ser posterior a la fecha de inicio») y no puede estar en el pasado («La fecha de fin no puede estar en el pasado»).

## Ingresar los precios

1. Haga clic en la fila de la lista en la tabla.
2. Haga clic en **Agregar productos** y elija los productos o variantes.
3. Ingrese el **Precio de lista**. Indique una **Cant. mín.** si el precio solo vale a partir de cierta cantidad.
4. Haga clic en **Guardar precios**.

> **Consejo:** los productos que no están en una lista conservan su precio base. Elija una lista como **Lista de precios predeterminada** de un [grupo de clientes](topic:customers-groups): la caja la aplica automáticamente en cuanto se elige un cliente del grupo. Los precios a partir de una cantidad mínima todavía no se aplican en la caja.
