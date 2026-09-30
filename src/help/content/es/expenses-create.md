---
id: expenses-create
title: Registrar un gasto
category: Ventas y gastos
order: 604
routes: [/admin/expenses]
keywords: [gasto, gastos, egreso, cargo, suministros, transporte, recibo, comprobante, categoría de gasto, borrador, enviar, caja chica]
related: [expenses-approve, shifts-cash-movements, faq-dates]
---
La página **Gastos** lleva el control de los gastos de la tienda: suministros, transporte, reparaciones, alquiler…

![La lista de gastos](shot:admin-expenses)

1. En el menú, haga clic en **Gastos** y luego en **Nuevo gasto**.
2. Escriba la **Fecha**, el **Monto** y la **Descripción**.
3. Elija la **Categoría** y escriba el **Proveedor / beneficiario**.
4. Elija **Pagado con**: **Efectivo**, **Tarjeta**, **Transferencia bancaria** u **Otro**.
5. Para efectivo tomado de un cajón, elija la caja en **Desde la caja**. Deje **Fuera de caja** para la caja chica.
6. Escriba la **Referencia del recibo** y **Notas** si hace falta.
7. Haga clic en **Enviar** para mandarlo a aprobación, o en **Guardar borrador** para completarlo más tarde.

![El formulario Nuevo gasto](shot:expense-form)

> **Atención:** la fecha de un gasto no puede estar en el futuro («La fecha del gasto no puede estar en el futuro»).

Un gasto por encima del umbral de aprobación de la tienda pasa al estado **enviado** y espera una [aprobación](topic:expenses-approve). Por debajo del umbral, se aprueba automáticamente.

> **Consejo:** la pestaña **Categorías** crea sus categorías de gastos (electricidad, reparaciones…) con **Agregar categoría**, para los reportes.

> **Consejo:** un gasto pagado en gourdes se registra en gourdes: elija **HTG** junto al **Monto**. La aplicación lo convierte a dólares a la tasa de venta para los reportes y conserva el monto en gourdes. Pagado en efectivo en una caja, sale de los gourdes del cajón.
