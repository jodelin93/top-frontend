---
id: users-invitations
title: Agregar un usuario o invitarlo
category: Personal
order: 1203
routes: [/admin/users]
keywords: [usuario, agregar usuario, crear usuario, cuenta, acceso, invitación, invitado, contraseña inicial, sucursales, rol, empleado]
related: [users-manage, account-invitations, roles-permissions, employees]
---
La página **Usuarios** requiere el permiso **Administrar cuentas del personal** (propietario y administrador de forma predeterminada). La lista muestra **Nombre**, **Correo electrónico**, **Rol**, **Sucursales**, **Estado**, **2FA** y **Último inicio de sesión**; su propia fila lleva **(usted)**.

![La lista de usuarios](shot:admin-users)

1. Haga clic en **Agregar usuario**.
2. Escriba el **Correo electrónico**, luego el **Nombre** y el **Apellido**.
3. Elija el **Rol**, por ejemplo **Cajero**.
4. En **Acceso a sucursales**, elija **Todas las sucursales** o **Solo algunas sucursales** y márquelas.
5. Escriba una **Contraseña** inicial.
6. Haga clic en **Agregar usuario**.

![El formulario Agregar usuario](shot:user-form)

| Caso | Qué sucede |
| --- | --- |
| El correo electrónico todavía no tiene cuenta | La cuenta se crea con la contraseña escrita. La persona puede iniciar sesión de inmediato. |
| El correo electrónico ya tiene una cuenta (en otra tienda) | La contraseña escrita no se usa. La persona recibe una **invitación**; su estado es «Invitado — esperando aceptación». |

Una persona invitada solo tiene acceso a la tienda después de aceptar la invitación, en **Seguridad de la cuenta** o en el panel (vea [Invitaciones y cambio de tienda](topic:account-invitations)).

> **Atención:** nadie puede dar más permisos de los que tiene. Solo un propietario puede nombrar a otro propietario.

> **Consejo:** comunique la contraseña inicial de palabra y pida a la persona que la cambie en su primer inicio de sesión ([Seguridad de la cuenta](topic:account-security)).
