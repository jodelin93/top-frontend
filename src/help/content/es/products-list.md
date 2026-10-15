---
id: products-list
title: La lista de productos y las etiquetas
category: Catálogo
order: 801
routes: [/admin/products]
keywords: [productos, catálogo, lista, buscar, filtrar, exportar, CSV, Excel, descontinuar, etiquetas, imprimir etiquetas, etiquetas de precio]
related: [products-create, products-variants, products-import]
---
La página **Productos** (menú **Catálogo**) muestra todo su catálogo: SKU, código de barras, categoría, impuesto, precio, existencias, tipo y estado. Requiere el permiso de gestionar productos (propietario, administrador, gerente, encargado de almacén).

![La lista de productos](shot:admin-products)

1. Escriba un nombre, un SKU o un código de barras en **Buscar por nombre, SKU o código de barras...**.
2. Si hace falta, filtre por **Categoría** (una categoría incluye sus subcategorías), **Tipo**, estado (**Activo**, **Inactivo**, **Descontinuado**), **Etiquetas** o **Sucursal**.
3. Elija el orden en **Ordenar por**: **Más recientes primero** o **Más antiguos primero** (fecha de creación), nombre, precio, existencias, categoría, SKU o **Modificados recientemente**. La elección se guarda en esta computadora.
4. Para exportar el catálogo, haga clic en **Exportar CSV** o **Exportar Excel**.

Un producto vendido sin existencias (un servicio, por ejemplo) muestra **—** en la columna Existencias y no aparece en el **Inventario**.

Cada fila tiene íconos a la derecha:

- el lápiz (**Editar**) abre la ficha del producto;
- las capas (**Variantes**) aparecen en los productos con variantes;
- la papelera roja (**Descontinuar**) retira el producto de la venta.

> **Atención:** un producto nunca se elimina. **Descontinuar** lo pasa al estado **Descontinuado**: ya no se vende, pero se conserva su historial de ventas y de existencias.

En la parte superior de la página, otros botones abren: **Unidades** ([productos por peso](topic:products-units-weight)), **Atributos** ([variantes](topic:products-variants)) e **Imprimir etiquetas**.

## Imprimir etiquetas de precio

1. Haga clic en **Imprimir etiquetas**.
2. Haga clic en **Agregar** junto a cada producto que desee y luego indique la cantidad de etiquetas.
3. Elija el **Idioma de las etiquetas** y luego haga clic en **Preparar … etiquetas**: las etiquetas se muestran como se imprimirán.
4. Haga clic en **Imprimir**.

Las etiquetas miden **1 × 1 pulgada**. Cada una muestra el nombre, el precio y el código de barras del código del producto (el SKU cuando el producto no tiene código de barras).

- **Con una impresora de etiquetas configurada en JodaPrint**, las etiquetas van directamente a ella, sin la ventana de impresión del navegador. El mensaje **… etiquetas enviadas a la impresora de etiquetas** lo confirma. Vea [Hardware](topic:hardware).
- **Sin ella**, se abre la ventana de impresión del navegador: elija allí la impresora de etiquetas y un papel de 1 × 1 pulgada.

> **Consejo:** un código hecho solo de dígitos se imprime con barras más gruesas, que los lectores leen más fácilmente. Un código muy largo no cabe en la etiqueta: se escribe sin código de barras.

> **Consejo:** en el teléfono, los productos se muestran como tarjetas, con los mismos botones.
