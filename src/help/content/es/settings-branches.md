---
id: settings-branches
title: Sucursales, cajas y numeración de ventas
category: Configuración
order: 1305
routes: [/admin/settings?tab=branches, /admin/settings]
keywords: [sucursal, tienda, caja, registradora, nueva caja, cajón de dinero, cajón compartido, numeración, prefijo, código de sucursal, zona horaria]
related: [settings-warehouses, shifts-open, devices]
---
Una sucursal es una tienda física. Cada caja pertenece a una sucursal.

![La pestaña Sucursales y cajas](shot:settings-branches)

## Crear una sucursal

1. En la pestaña **Sucursales y cajas**, haga clic en **Nueva sucursal**.
2. Complete el **Nombre**, el **Código**, la dirección, la **Zona horaria** (America/Port-au-Prince) y la **Moneda**.
3. Haga clic en **Crear sucursal**.

El **Código** sirve de prefijo para los números de venta: MAIN-000123, DT-000045… Cada sucursal tiene su propia numeración. Elija letras cortas y claras. Las ventas más antiguas conservan su número original (por ejemplo S-000544).

## Crear una caja

1. En **Cajas**, haga clic en **Nueva caja**.
2. Elija la **Sucursal** y la **Ubicación de inventario** de donde la caja descuenta los artículos vendidos.
3. Elija la **Política de cajones**: **Un cajero por cajón** o **Cajón compartido**.
4. Haga clic en **Crear caja**.

En la ficha de una caja, la sección **Cajones de dinero** lista sus cajones: **Agregar cajón**, **Activar** o **Desactivar**.

> **Atención:** una caja sin ubicación de inventario no puede vender.
