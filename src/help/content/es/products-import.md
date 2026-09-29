---
id: products-import
title: Importar productos (CSV)
category: Catálogo
order: 806
routes: [/admin/import]
keywords: [importación, importar, CSV, archivo, hoja de cálculo, Excel, plantilla, actualización masiva, carga masiva, columnas]
related: [products-list, categories]
---
La importación crea o actualiza muchos productos a partir de un archivo CSV. Siempre ve los cambios antes de guardar. Se necesita el permiso **Importar productos desde CSV**.

![La página Importar productos](shot:admin-import)

1. En el menú, haga clic en **Importar**.
2. Haga clic en **Descargar plantilla** para obtener un archivo con las columnas correctas.
3. Complete el archivo en una hoja de cálculo y luego guárdelo como CSV UTF-8 (5 000 filas y 2 MB como máximo).
4. Elija qué pasa con los **Productos existentes (mismo SKU)**: **Actualizar sus datos** o **Dejarlos sin cambios**.
5. Marque **Reemplazar también sus precios y costos** solo si el archivo contiene los nuevos precios.
6. Haga clic en **Elegir archivo** y seleccione su CSV.
7. Revise el resumen: **Productos nuevos**, **Actualizaciones**, **Sin cambios** y **Filas con errores**.
8. Corrija las filas con errores si hace falta y luego haga clic en **Importar N productos**.

Columnas principales:

- **sku** (obligatoria): reconoce los productos existentes;
- **name**: obligatoria para un producto nuevo;
- **category_code** y **tax_category_code**: códigos existentes;
- **price** y **cost**: solo productos simples, con punto decimal (p. ej. 4.50);
- **product_type**: simple, variable o composite;
- **status**: active, inactive o discontinued.

> **Consejo:** una celda vacía deja el valor existente sin cambios.

> **Atención:** la columna allow_backorder se ignora: nunca se permite vender con existencias por debajo de cero.
