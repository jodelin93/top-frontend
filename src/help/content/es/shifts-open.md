---
id: shifts-open
title: Abrir un turno de caja
category: Turnos de caja
order: 301
routes: [/pos]
keywords: [HTG, gourdes, turno, sesión, abrir turno, abrir caja, fondo de caja, fondo inicial, denominaciones, billetes, monedas, inicio del día, shift]
related: [shifts-cash-movements, shifts-close, shifts-settings]
---
En la aplicación, un turno de trabajo se llama **turno**. Un turno pertenece a una caja: empieza con el conteo del fondo de caja y termina con el conteo del cajón. Cada cajero abre y cierra su propio turno.

Con **Un cajero por cajón** (por defecto, vea [Sucursales y cajas](topic:settings-branches)), cada cajero vende en **su propio turno**: un segundo cajero en la misma caja nunca vende en el turno de un colega; la caja le pide **Abra su propio turno de caja en esta caja antes de vender**. Con **Cajón compartido**, varios cajeros venden en el mismo turno y cada venta conserva su cajero.

Abra el turno antes de la primera venta:

1. Verifique que esté elegida la caja correcta en la lista de la parte superior de la pantalla.
2. Haga clic en **Abrir turno**.
3. Deje activa la pestaña **Contar por denominación**.
4. Para cada billete o moneda, escriba la cantidad que hay en el cajón. El **Total contado** se calcula solo.
5. Si lo prefiere, haga clic en **Ingresar total** y escriba directamente el monto del **Fondo de caja**.
6. Si la tienda acepta otra moneda (por ejemplo el gourde), escriba en **Efectivo en HTG en el cajón** el monto de esa moneda que ya está en el cajón. Déjelo vacío si no hay. Al cierre, este monto cuenta en los HTG esperados.
7. Agregue un comentario en **Notas (opcional)** si lo necesita.
8. Revise la línea **Fondo de caja** al final y haga clic en **Abrir turno**.

![La ventana Abrir turno, con el fondo en dólares y los gourdes del cajón](shot:shift-open)


El botón de la barra superior muestra entonces el número de turno, por ejemplo **SH-000004 · Abierto**. Haga clic en él en cualquier momento para ver el detalle del cajón.

> **Atención:** por defecto, la caja se niega a cobrar una venta mientras no haya un turno abierto en ella: el botón **Cobrar** aparece en gris con el mensaje **No hay ninguna sesión de caja abierta en esta caja**. El propietario puede cambiarlo en **Configuración › General** (**Exigir una sesión de caja abierta para vender**). Las ventas hechas sin conexión pasan igualmente y se revisan al sincronizar.

> **Consejo:** la lista de denominaciones (billetes y monedas) se configura en **Administración** > **Turnos de caja y efectivo**, bloque **Denominaciones de efectivo** (vea [Denominaciones, día comercial y correcciones](topic:shifts-settings)).

> **Consejo:** si el cajero anterior le entregó la caja al cerrar, su turno ya está abierto con el efectivo que él contó como fondo de caja.
