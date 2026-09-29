---
id: shifts-close
title: Cerrar el turno, contar el cajón e imprimir el reporte Z
category: Turnos de caja
order: 303
routes: [/pos]
keywords: [cerrar, cierre, cierre de caja, corte de caja, fin del día, conteo, conteo a ciegas, diferencia, faltante, sobrante, tolerancia, reporte Z, informe Z, entregar la caja, volver a contar]
related: [shifts-open, shifts-admin, approvals, shifts-cash-movements]
---
Al final del turno, cuente el cajón y cierre el turno.

1. Haga clic en el botón del turno en la barra superior.
2. Haga clic en **Cerrar turno**.
3. Deje marcada la casilla **Conteo a ciegas**: usted cuenta sin ver el monto esperado, lo que hace el conteo más confiable.
4. Haga clic en **Iniciar conteo**.

> **Atención:** en cuanto empieza el conteo, la caja deja de vender: el turno pasa a **Conteo en curso**. Para vender de nuevo, haga clic en **Volver a vender**. Para retomar el conteo más tarde: **Continuar el cierre**.

## Contar

1. Escriba la cantidad de cada billete y moneda en dólares.
2. En **Efectivo en HTG en el cajón**, escriba el total de gourdes presentes (déjelo vacío si no hay).
3. Haga clic en **Revisar conteo**.

La aplicación muestra, para cada moneda, **Contado**, **Esperado** y **Diferencia**:

- diferencia en cero o dentro de la tolerancia: mensaje verde, por ejemplo «Dentro de la tolerancia de US$ 5.00.»;
- diferencia por encima de la tolerancia: mensaje rojo; el **Motivo de la diferencia** es obligatorio y el cajero debe obtener la aprobación de un gerente.

## Terminar

1. Si se pide un motivo, complete **Motivo de la diferencia**.
2. Si el siguiente cajero continúa con este cajón, elija su nombre en **Entregar a (opcional)**: su turno se abrirá con el efectivo contado. Si no, deje **Nadie: solo cerrar**.
3. Agregue **Notas (opcional)** si lo necesita. En caso de duda, haga clic en **Volver a contar**.
4. Haga clic en **Cerrar turno** (o **Cerrar y entregar**).

Cuando la diferencia supera la tolerancia, se abre la ventana **Se requiere la aprobación de un gerente**: el gerente revisa el cajón, escribe sus credenciales y hace clic en **Aprobar**. Su nombre aparece en el reporte Z (**Aprobado por**).

## El reporte Z

La ventana **Turno cerrado** muestra el **INFORME Z**: horarios, cajero y gerente, ventas por método de pago, ventas anuladas, cálculo del cajón en USD y HTG, movimientos de efectivo, conteo, diferencia, tolerancia y motivo.

1. Haga clic en **Imprimir informe Z**.
2. Haga clic en **Listo**.

> **Consejo:** una reimpresión del reporte Z lleva la leyenda COPIA. Los reportes de turnos anteriores se encuentran en [Supervisar los turnos](topic:shifts-admin). La tolerancia de diferencia se configura en la configuración de la tienda.
