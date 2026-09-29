---
id: roles-permissions
title: Roles y permisos
category: Personal
order: 1205
routes: [/admin/roles]
keywords: [rol, roles, permisos, derechos, autorizaciones, accesos, nuevo rol, rol personalizado, predefinido, seleccionar todo]
related: [getting-started-roles, users-manage, approvals]
---
Un rol es un conjunto de permisos. Los cuatro roles predefinidos (Propietario, Administración, Gerente, Cajero) llevan la mención **Predefinido** y no se pueden eliminar. La página requiere el permiso **Administrar roles y permisos**.

![La página Roles y permisos](shot:admin-roles)

## Ver y modificar los permisos de un rol

1. En la lista de la izquierda, haga clic en un rol. La cantidad de personas que lo tienen se muestra debajo de su nombre.
2. Los permisos están agrupados por tema: **Punto de venta**, **Ventas**, **Efectivo**, **Clientes**, etc.
3. Marque o desmarque los permisos. **Seleccionar todo** y **Desmarcar todo** actúan sobre un tema completo.
4. Haga clic en **Guardar** (o **Descartar cambios**).

Los cambios se aplican la próxima vez que cada persona cargue una página.

> **Atención:** no puede modificar un rol que tenga permisos que usted no tiene, ni agregar un permiso que usted no tiene. El rol **Propietario** siempre tiene todos los permisos.

## Crear un rol personalizado

1. Haga clic en **Nuevo rol**.
2. Escriba el **Nombre** (la **Clave** se crea sola) y una **Descripción**.
3. En **Copiar permisos de**, elija el rol de partida, por ejemplo **Cajero**.
4. Haga clic en **Crear rol**, marque los permisos que quiera agregar y luego haga clic en **Guardar**.
5. Asigne este rol a las personas correspondientes en **Usuarios**.

Para eliminar un rol personalizado, ábralo y haga clic en **Eliminar**. La eliminación se rechaza mientras alguna persona todavía tenga ese rol.

> **Consejo:** los roles **Accountant** (contador) e **Inventory clerk** (encargado de almacén) son ejemplos de roles personalizados: adáptelos a su tienda.
