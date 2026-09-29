---
id: audit-log
title: El registro de auditoría
category: Hardware y sistema
order: 1403
routes: [/admin/audit]
keywords: [registro de auditoría, auditoría, bitácora, trazabilidad, quién hizo, aprobado por, historial de acciones, control]
related: [approvals, system-events, settings-history]
---
El registro de auditoría guarda el rastro de cada acción sensible: quién la hizo, quién la aprobó y qué cambió. Las entradas no se pueden modificar ni eliminar.

![El registro de auditoría](shot:admin-audit)

1. En el menú, haga clic en **Registro de auditoría**.
2. Escriba una acción en **Filtrar por acción, p. ej., sale.voided**.
3. Elija un **Tipo de evento** si es necesario.
4. Haga clic en la flecha de una fila para ver los detalles (**Antes** / **Después**, dirección IP, montos, número de venta…).

Las columnas **Quién**, **Aprobado por**, **Objeto** y **Motivo** responden a las preguntas habituales de un control.

> **Consejo:** acciones útiles: sale.voided (venta anulada), user.password_reset (contraseña restablecida), role.updated (rol modificado), session.created (inicio de sesión), auth.login_failed (contraseña incorrecta).

> **Atención:** el registro completo está reservado a las personas que tienen acceso a todas las sucursales.
