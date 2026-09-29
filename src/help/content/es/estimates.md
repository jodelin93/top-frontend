---
id: estimates
title: Crear una cotización y convertirla en venta
category: Ventas y gastos
order: 603
routes: [/admin/estimates]
keywords: [cotización, presupuesto, proforma, pro forma, estimación, oferta de precio, válido hasta, aceptada, rechazada, vender en la caja, duplicar]
related: [pos-group-pricing, sales-history, customers-list]
---
Una cotización presenta precios a un cliente antes de la compra. No reserva existencias. La página **Cotizaciones** muestra cada cotización con su estado: **Borrador**, **Enviada**, **Aceptada**, **Rechazada** o **Vendido**.

![La lista de cotizaciones](shot:admin-estimates)

## Crear una cotización

1. Haga clic en **Nueva cotización**.
2. En **Cliente**, escriba el nombre, el teléfono o el correo y elija el cliente. Para una persona que no está entre sus clientes, simplemente escriba su nombre.
3. Revise **Válido hasta** (30 días por defecto). Esta fecha no puede estar en el pasado.
4. En **Agregar productos**, busque cada producto y haga clic en **Agregar**.
5. En cada línea, ajuste la **Cant.**, el **Precio unitario** si da un precio especial, el descuento (**Desc. %**) y una **Nota**.
6. Si hace falta, agregue un descuento sobre toda la cotización, **Notas** y **Términos y condiciones** (anticipo…).
7. Haga clic en **Guardar cotización**. Los totales exactos (impuestos incluidos) se calculan al guardar.

## Enviar la cotización y anotar la respuesta

1. Haga clic en **Imprimir** (o guárdela en PDF), o en **Imprimir proforma** si el cliente pide una factura proforma.
2. Entréguela al cliente y luego haga clic en **Marcar como enviada**.
3. Cuando el cliente responda, haga clic en **Aceptada** o **Rechazada**.

> **Consejo:** **Duplicar** crea una nueva cotización a partir de esta. **Editar** permite, por ejemplo, extender la fecha de validez.

## Convertir en venta

1. Abra la cotización aceptada y haga clic en **Vender en la caja**.
2. La caja se abre con el cliente y los artículos, a los precios de la cotización. Un aviso recuerda «Cotización … — se vende a los precios cotizados; al completar la venta se convierte.»
3. Cobre normalmente. La cotización pasa al estado **Vendido**.

> **Atención:** una cotización vencida no se puede vender: primero edítela para extender **Válido hasta**. Los precios de la cotización valen una sola vez, para su cliente y sus cantidades; las unidades adicionales se cobran al precio normal. Si el carrito ya contiene artículos, la aplicación pide reemplazarlos.
