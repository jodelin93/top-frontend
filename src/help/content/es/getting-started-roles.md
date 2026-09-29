---
id: getting-started-roles
title: Entender los roles
category: Primeros pasos
order: 104
routes: []
keywords: [rol, roles, derechos, permisos, cajero, gerente, propietario, dueño, administrador, contador, almacenista, bodeguero, acceso]
related: [roles-permissions, approvals, users-manage]
---
Cada usuario recibe un rol. El rol decide qué menús se ven y qué acciones se permiten. Los roles se consultan en **Administración** > **Roles y permisos** (propietario y administrador).

| Rol | Para quién | Qué puede hacer | Qué no puede hacer |
| --- | --- | --- | --- |
| **Propietario** | El dueño de la tienda | Todo, incluso administrar a los demás propietarios. Este rol no se modifica. | — |
| **Administración** | La mano derecha del propietario | Administrar todo: ventas, inventario, configuración, cuentas del personal, roles, dispositivos. | Modificar o quitar a un propietario. |
| **Gerente** | El jefe de la tienda en el día a día | Vender, anular, reembolsar, administrar todos los turnos de caja, aprobar diferencias, descuentos y precios, administrar productos, inventario, compras, clientes, reportes, configuración. | Administrar las cuentas del personal, los roles, los dispositivos y la supervisión del sistema. |
| **Cajero** | El personal de caja | Vender, dar descuentos hasta el límite de la tienda, poner ventas en espera, abrir y cerrar su turno, registrar gastos, buscar y crear clientes, hacer cotizaciones, ver las existencias, reimprimir un recibo. | Cambiar un precio, superar el límite de descuento, vender a crédito, hacer movimientos de efectivo, reembolsar, anular. Estas acciones requieren la [aprobación de un gerente](topic:approvals). |
| **Inventory clerk** (almacenista) | La persona del inventario | Recibir, ajustar, contar y transferir existencias, administrar proveedores, órdenes de compra y productos. | Vender: no tiene acceso a la caja. |
| **Accountant** (contador) | El contador | Panel, reportes y exportaciones, ventas (solo lectura), gastos, liquidaciones de tarjeta, registro de auditoría. | Vender o modificar las ventas. |

> **Consejo:** cuando un cajero intenta una acción reservada, se abre la ventana **Se requiere la aprobación de un gerente**. Un gerente escribe sus credenciales en el momento; la aprobación vale una sola vez, para esa acción.

> **Consejo:** si le falta una página en el menú, no es una falla: su rol no da acceso a ella. Pregunte al administrador.
