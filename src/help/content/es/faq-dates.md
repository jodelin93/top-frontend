---
id: faq-dates
title: ¿Por qué se rechaza una fecha?
category: Preguntas frecuentes
order: 1607
routes: []
keywords: [fecha rechazada, fecha no válida, fecha en el pasado, fecha en el futuro, fecha de fin, período, del al, validez, vencimiento, fecha de nacimiento]
related: [expenses-create, purchasing-invoices, price-lists, discounts-admin, estimates]
---
Para evitar errores al escribir, la aplicación controla las fechas. A menudo, el calendario ni siquiera ofrece las fechas no permitidas.

| Dónde | Regla | Mensaje |
| --- | --- | --- |
| Gasto: **Fecha** | No en el futuro | «La fecha del gasto no puede estar en el futuro» |
| Factura de proveedor: **Fecha de la factura** | No en el futuro | «La fecha de la factura no puede estar en el futuro» |
| Factura de proveedor: **Fecha de vencimiento** | No antes de la fecha de la factura | «La fecha de vencimiento no puede ser anterior a la fecha de la factura.» |
| Pago o nota de crédito de proveedor | No en el futuro | «La fecha no puede estar en el futuro» |
| Orden de compra: **Entrega prevista** | No en el pasado | «La fecha de entrega prevista no puede estar en el pasado» |
| Cliente: fecha de nacimiento | No en el futuro, no antes de 1900 | «La fecha no puede ser anterior a 1900» |
| Descuento, lista de precios: fin de validez | Después del inicio y no en el pasado | «Debe ser posterior a la fecha de inicio», «La fecha de fin no puede estar en el pasado» |
| Cotización: **Válido hasta** | No en el pasado | «La fecha de validez no puede estar en el pasado» |
| Configuración: **Entra en vigor** | En el futuro, o vacío | «Elija una fecha y hora futuras, o déjelo vacío» |
| Empleado: fecha de contratación | Como máximo un año por adelantado | «La fecha de contratación no puede ser más de un año en el futuro» |
| Empleado: último día | No en el futuro, no antes de la contratación | «La fecha de baja es anterior a la fecha de contratación» |
| Asistencia: horas registradas | No en el futuro, salida después de la entrada, 24 h como máximo | «La hora no puede estar en el futuro»… |
| Períodos (reportes, ventas, turnos, estados de cuenta) | Inicio ≤ fin | El fin no puede ser anterior al inicio |

> **Consejo:** una fecha ya guardada que ahora quedó en el pasado (por ejemplo, el fin de una cotización antigua) puede conservarse tal cual; la regla se aplica cuando usted escribe o cambia la fecha.
