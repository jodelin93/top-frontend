---
id: employees
title: Administrar los empleados
category: Personal
order: 1201
routes: [/admin/employees]
keywords: [empleado, personal, ficha de empleado, código de empleado, puesto, sucursales, fecha de contratación, desactivar, baja, salida, reactivar]
related: [employees-attendance, users-invitations]
---
Un **Empleado** es una persona que trabaja para la tienda (puesto, sucursales, horas). Un **Usuario** es una cuenta para iniciar sesión con un rol (vea [Agregar un usuario](topic:users-invitations)). Un empleado puede tener una cuenta o no: una persona de limpieza tiene una ficha para sus horas, un cajero tiene ambas, vinculadas.

> **Atención:** la página **Empleados** requiere el permiso para administrar empleados (propietario, administrador, gerente). Para vincular una cuenta de usuario también se necesita el permiso **Administrar cuentas del personal**.

![La lista de empleados](shot:admin-employees)

## Agregar un empleado

1. Haga clic en **Agregar empleado**.
2. Complete **Nombre** y **Apellido** (obligatorios).
3. Si hace falta, complete **Puesto**, **Código de empleado** (único), **Teléfono**, **Correo electrónico** y **Fecha de contratación** (como máximo un año por adelantado).
4. En **Cuenta de usuario**, elija la cuenta con la que la persona inicia sesión, o **Sin cuenta**.
5. En **Sucursales**, marque las sucursales donde trabaja la persona y elija la **Principal**.
6. Agregue **Notas (opcional)** y luego haga clic en **Guardar**.

> **Atención:** una cuenta de usuario solo puede estar vinculada a un empleado. Un gerente limitado a ciertas sucursales solo puede asignar un empleado a sus sucursales.

## Buscar y editar

Escriba un nombre, un código de empleado o un correo en **Buscar por nombre, código o correo**, filtre por estado o sucursal y luego haga clic en el lápiz de la fila.

## Desactivar a un empleado que se va

Un empleado nunca se elimina: se desactiva.

1. Haga clic en el ícono rojo (persona tachada) de la fila.
2. Indique el **Último día** (no en el futuro, ni antes de la fecha de contratación) y un **Motivo (opcional)**.
3. Haga clic en **Desactivar**.

Si hay una entrada registrada en curso, se cierra. Si el empleado tiene una cuenta, esa cuenta se suspende y se cierra su sesión en todos los dispositivos. Para que vuelva, filtre por **Inactivo** y luego haga clic en **Reactivar**.
