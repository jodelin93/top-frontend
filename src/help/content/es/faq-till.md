---
id: faq-till
title: "Preguntas frecuentes: en la caja"
category: Preguntas frecuentes
order: 1601
routes: [/pos]
keywords: [problema, descuento rechazado, aprobación rechazada, stock insuficiente, existencias insuficientes, inventario negativo, producto no encontrado, caja no vende, turno]
related: [approvals, pos-discounts, inventory-adjust, shifts-open]
---
## El cajero no puede aplicar un descuento

Un cajero puede dar un descuento hasta el límite de la tienda; por encima, debe escribir un motivo, y la ventana **Se requiere la aprobación de un gerente** se abre al momento de cobrar. Un gerente presente escribe su correo electrónico y su contraseña, y luego hace clic en **Aprobar** (vea [Pedir una aprobación](topic:approvals)). Si no hay ningún gerente, reduzca el descuento o ponga el carrito en espera.

## La ventana de aprobación rechaza al gerente

- El gerente debe tener él mismo el permiso solicitado: otro cajero no puede aprobar.
- No debe ser la persona con la sesión iniciada: nadie puede aprobarse a sí mismo.
- Si tiene la autenticación en dos pasos, debe escribir el código de 6 dígitos.
- La aprobación vale 2 minutos y para una sola acción: vuelva a empezar si se superó el plazo.

## «Stock insuficiente» o «Solo hay … en existencia»

La caja no permite vender más que las existencias disponibles. Revise el estante y la bodega. Si las existencias reales son mayores, un gerente [ajusta las existencias](topic:inventory-adjust) y luego la venta puede continuar. Sin conexión, la venta se acepta pero se abre un caso en la [Cola de revisión](topic:review-queue).

## La caja no permite vender

- El turno no está abierto y la tienda lo exige: [abra el turno](topic:shifts-open).
- El turno está en **Conteo en curso**: haga clic en **Volver a vender** o termine el cierre.
- La pantalla **La venta sin conexión está en pausa**: vea [Vender sin conexión](topic:offline-mode).

## «No se encontró ningún producto para …»

El código de barras escaneado no está vinculado a ningún producto. Busque el artículo por su nombre; un gerente puede agregar ese código a la variante (vea [Códigos de barras](topic:products-variants)).
