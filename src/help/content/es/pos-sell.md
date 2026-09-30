---
id: pos-sell
title: Agregar productos y gestionar el carrito
category: Caja
order: 204
routes: [/pos]
keywords: [vender, producto, escanear, código de barras, buscar, búsqueda, carrito, cantidad, nota, vaciar, agotado, sin existencias, categoría]
related: [pos-weighed-items, pos-customer, pos-discounts, pos-payment, faq-till]
---
Tiene tres formas de agregar un producto:

- **Escanear el código de barras**: el producto se agrega solo al carrito.
- **Buscar**: escriba una parte del nombre, el SKU o el código de barras en **Buscar productos o escanear un código de barras... (F2)** y luego haga clic en la ficha.
- **Explorar**: haga clic en una categoría (**Todo**, **Bebidas**…) y luego en la ficha del producto.

Cada ficha muestra el nombre, la variante (talla, color), el SKU, el precio y las existencias, por ejemplo **65 en existencia**.

Hacer clic de nuevo en la misma ficha (o escanear de nuevo el producto) aumenta la cantidad de su línea: el producto aparece una sola vez en el carrito. La línea conserva su descuento o su precio modificado. Solo los productos vendidos por peso tienen una línea por pesada.

![El carrito con varios artículos](shot:pos-cart)

## Gestionar el carrito

El carrito, a la derecha, muestra cada línea con su precio unitario, su cantidad y su total.

- Haga clic en **+** o **−** para cambiar la cantidad, o escríbala en la casilla.
- Haga clic en la papelera para quitar la línea.
- Haga clic en **Agregar una nota** para escribir un comentario que se imprime en el recibo.
- Haga clic en **Vaciar carrito** para borrarlo todo (se pide una confirmación).

Debajo de las líneas: el **Subtotal**, los descuentos, el **Impuesto**, el **Total** y su equivalente en la otra moneda (por ejemplo **≈ en HTG**).

> **Atención:** la caja nunca vende más de las existencias disponibles. Una ficha **Agotado** aparece en gris. Si pide demasiado, un mensaje indica la cantidad disponible, por ejemplo «Solo hay 3 × … en existencia».

> **Consejo:** si un código escaneado es desconocido, aparece el mensaje «No se encontró ningún producto para …». Verifique el artículo o búsquelo por su nombre.

> **Consejo:** con el teclado, **↑ ↓** eligen una línea, **+** y **−** cambian su cantidad y **Supr** la quita.

Sin conexión, la búsqueda por nombre, SKU o código de barras también funciona: usa la copia del catálogo guardada en el dispositivo (vea [Vender sin conexión](topic:offline-mode)).
