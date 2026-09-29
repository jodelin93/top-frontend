---
id: products-create
title: Crear o modificar un producto
category: Catálogo
order: 802
routes: [/admin/products]
keywords: [nuevo producto, crear producto, agregar producto, SKU, precio de venta, costo, categoría de impuesto, existencia mínima, stock mínimo, imagen, foto, tipo de producto, simple, variable, compuesto, paquete, número de serie]
related: [products-list, products-variants, categories, tax-categories]
---
1. En la página **Productos**, haga clic en **Nuevo producto**.
2. Complete **Nombre** y **SKU** (su código interno, único).
3. Si hace falta, agregue una **Descripción** y un **Código de barras** (el impreso en el empaque).
4. Elija el **Tipo** (vea la tabla).
5. Escriba el **Precio de venta** y el **Costo unitario** (precio de compra, útil para los márgenes).
6. Elija la **Categoría** y la **Categoría de impuesto**. Deje **Tasa de impuesto predeterminada de la tienda** si el producto sigue la tasa normal.
7. Complete si hace falta **Marca**, **Fabricante**, **Unidad de medida** y **Etiquetas** (escriba una palabra y luego presione Enter).
8. En **Surtido por sucursal**, marque sucursales solo si el producto no se vende en todas.
9. Indique la **Existencia mínima** y el **Punto de reorden** para las alertas de existencias bajas.
10. Deje **Controlar existencias** marcado para un artículo físico; desmárquelo para un servicio. Marque **Controlar números de serie** para los equipos que se venden con un número.
11. Haga clic en **Crear producto**.

![El formulario Nuevo producto](shot:product-form)

| Tipo | Cuándo usarlo |
| --- | --- |
| **Simple** | Un solo artículo, un solo precio. El precio se escribe en la ficha. |
| **Variable (con variantes)** | El mismo producto en varias tallas o colores: cada variante tiene su SKU, su código de barras, su precio y sus existencias. |
| **Compuesto (paquete)** | Un lote o estuche que se vende como un solo artículo. |

> **Atención:** el tipo ya no se puede cambiar después de la creación. Para un producto variable o compuesto, el precio se escribe en las [variantes](topic:products-variants) después de guardar.

> **Consejo:** si el dígito de control de un código de barras EAN o UPC es incorrecto, la aplicación le avisa.

## Modificar un producto y agregar imágenes

1. Haga clic en el lápiz de la fila del producto.
2. Modifique los campos que desee. **Estado** cambia el producto a **Activo**, **Inactivo** o **Descontinuado**.
3. Abajo, en **Imágenes**, haga clic en **Agregar imágenes**: JPEG, PNG o WebP de 5 MB como máximo, 10 imágenes por producto.
4. Haga clic en la estrella de una imagen para convertirla en la imagen principal (listas y caja).
5. Haga clic en **Guardar cambios**.

> **Consejo:** las imágenes solo se pueden agregar después de la creación: primero cree el producto y luego vuelva a abrirlo.
