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
5. Haga clic en **Agregar usuario**. No escribe ninguna contraseña: la persona elige la suya.

![El formulario Agregar usuario](shot:user-form)

| Caso | Qué sucede |
| --- | --- |
| El correo electrónico todavía no tiene cuenta | La persona recibe un correo **Elegir mi contraseña** (el enlace vale 72 horas). Al elegir su contraseña confirma su dirección de correo; luego puede iniciar sesión. Mientras tanto su estado es «Esperando la contraseña (correo no confirmado)». |
| El correo electrónico ya tiene una cuenta (en otra tienda) | La persona recibe una **invitación**; su estado es «Invitado — esperando aceptación». |

Una persona invitada solo tiene acceso a la tienda después de aceptar la invitación, en **Seguridad de la cuenta** o en el panel (vea [Invitaciones y cambio de tienda](topic:account-invitations)).

> **Atención:** nadie puede dar más permisos de los que tiene. Solo un propietario puede nombrar a otro propietario.

> **Consejo:** ¿no llegó el correo? Revise la dirección y la carpeta de correo no deseado, luego haga clic en el icono de envío de su fila (**Enviar de nuevo el enlace para elegir la contraseña**). Un nuevo enlace reemplaza al anterior.
