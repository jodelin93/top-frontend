---
id: products-import
title: Importar productos (Excel o CSV)
category: Catálogo
order: 806
routes: [/admin/import]
keywords: [importación, importar, CSV, archivo, hoja de cálculo, Excel, plantilla, actualización masiva, carga masiva, columnas]
related: [products-list, categories]
---
La importación crea o actualiza muchos productos a partir de un archivo de Excel (.xlsx) o un archivo CSV. Siempre ve los cambios antes de guardar. Se necesita el permiso **Importar productos desde CSV**.

![La página Importar productos](shot:admin-import)

1. En el menú, haga clic en **Importar**.
2. Haga clic en **Plantilla Excel** (o **Plantilla CSV**) para obtener un archivo con las columnas correctas.
3. Complete el archivo y guárdelo: como libro de Excel (.xlsx, solo se lee la primera hoja) o como CSV UTF-8. 5 000 filas y 2 MB como máximo.
4. Elija qué pasa con los **Productos existentes (mismo SKU)**: **Actualizar sus datos** o **Dejarlos sin cambios**.
5. Marque **Reemplazar también sus precios y costos** solo si el archivo contiene los nuevos precios.
6. Haga clic en **Elegir archivo** y seleccione su archivo de Excel o CSV.
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

> **Consejo:** el formato antiguo de Excel (.xls) no se lee: en Excel, use **Guardar como › Libro de Excel (.xlsx)**. En la plantilla Excel todas las celdas son texto: los códigos conservan sus ceros iniciales.

> **Atención:** la columna allow_backorder se ignora: nunca se permite vender con existencias por debajo de cero.
