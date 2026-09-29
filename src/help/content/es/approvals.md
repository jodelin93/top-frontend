---
id: approvals
title: Hacer aprobar una acción por un responsable
category: Caja
order: 210
routes: []
keywords: [aprobación, aprobar, gerente, encargado, responsable, supervisor, autorización, permiso, credenciales, segunda persona, rechazado]
related: [getting-started-roles, pos-discounts, pos-price-change, faq-till, expenses-approve]
---
Cuando una persona intenta una acción que no tiene permiso para hacer sola, se abre la ventana **Se requiere la aprobación de un gerente**. Indica el permiso que falta. Un responsable presente puede aprobar sin que nadie cierre sesión.


1. El responsable escribe su **Correo electrónico del gerente** y su **Contraseña**.
2. Si tiene activada la autenticación de dos factores, escribe también el **Código de dos factores**.
3. Hace clic en **Aprobar**. La acción continúa normalmente.
4. Si hay varias acciones que aprobar (un precio y un descuento, por ejemplo), la ventana vuelve a aparecer para cada una.

Para desistir, haga clic en **Cancelar**.

## Acciones que suelen requerir aprobación

| Acción | Quién la solicita |
| --- | --- |
| Modificar un precio, descuento por encima del límite | Cajero, al cobrar |
| Venta **A cuenta** (a crédito), exceso del límite de crédito | Cajero |
| Entrada o salida de efectivo, depósito en caja fuerte, diferencia de caja | Cajero (vea [Turnos](topic:shifts-cash-movements)) |
| Devolución fuera de plazo, reembolso con otro medio de pago, anulación | Persona sin el permiso |
| Aprobar su propio gasto, su propia orden de compra | Todos, incluso el propietario |
| Carga grande en una tarjeta de regalo o en un crédito en tienda | Segunda persona obligatoria |

## Reglas

- El responsable debe tener él mismo el permiso solicitado.
- Debe ser una persona distinta de la que realiza la acción.
- La aprobación sirve una sola vez, solo para esa acción, y es válida por 2 minutos.
- Cada aprobación queda registrada en el [registro de auditoría](topic:audit-log), con el nombre del responsable (**Aprobado por**).

> **Atención:** el responsable nunca da su contraseña: la escribe él mismo en la ventana.
