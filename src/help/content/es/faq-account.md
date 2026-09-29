---
id: faq-account
title: Cuenta bloqueada, contraseña olvidada, acceso denegado
category: Preguntas frecuentes
order: 1603
public: true
routes: [/auth/login]
keywords: [bloqueada, bloqueado, contraseña olvidada, olvidé mi contraseña, demasiados intentos, no puedo iniciar sesión, no puede entrar, invitado, suspendido, rol, acceso, permisos]
related: [auth-login, users-manage, account-invitations]
---
## Mi cuenta está bloqueada

Después de 5 contraseñas (o códigos 2FA) incorrectos seguidos, la cuenta se bloquea 15 minutos. La página de inicio de sesión muestra: «Demasiados intentos fallidos. Esta cuenta está bloqueada durante unos minutos.»

1. Espere 15 minutos sin volver a intentarlo: cada nuevo intento incorrecto prolonga el bloqueo.
2. Verifique que la tecla de mayúsculas (Bloq Mayús / Caps Lock) no esté activada.
3. Vuelva a intentarlo con la contraseña correcta.

> **Atención:** si su cuenta se bloquea sin que usted haya intentado iniciar sesión, puede que alguien haya intentado entrar. Avise al propietario y cambie su contraseña.

## Olvidé mi contraseña

Pídaselo al propietario o a un administrador: hace clic en el ícono de llave de su fila en **Usuarios** y le da una nueva contraseña (vea [Restablecer la contraseña](topic:users-manage)). Luego cámbiela usted mismo en **Seguridad de la cuenta**.

## Un empleado nuevo no puede iniciar sesión

Verifique en **Usuarios**:

- su **Estado**: **suspendido** bloquea el acceso;
- la indicación «Invitado — esperando aceptación»: la persona ya tenía una cuenta y debe aceptar la invitación en **Seguridad de la cuenta** (vea [Invitaciones](topic:account-invitations));
- su correo electrónico: un error de escritura impide iniciar sesión.

## El cambio de rol no se aplica

Un cambio de rol o de permisos se aplica en la próxima carga de la página. Además, la sesión de la persona se cierra cuando cambia su rol: simplemente debe volver a iniciar sesión.

## Me falta una página o un botón

Su rol no da acceso a esa página o a esa acción. Pida al administrador que revise sus permisos (vea [Entender los roles](topic:getting-started-roles)).
