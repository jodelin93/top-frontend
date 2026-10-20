---
id: auth-forgot-password
title: Olvidó su contraseña
category: Primeros pasos
order: 109
public: true
routes: [/auth/forgot-password, /auth/reset-password]
keywords: [olvidé mi contraseña, contraseña olvidada, restablecer contraseña, nueva contraseña, enlace de restablecimiento, enlace por correo, contraseña perdida]
related: [auth-login, faq-account, users-manage]
---
Si ya no recuerda su contraseña, elija una nueva usted mismo con un enlace enviado a su correo electrónico.

![La página Olvidó su contraseña](shot:auth-forgot-password)

1. En la página de inicio de sesión, haga clic en **¿Olvidó su contraseña?** (junto a **Contraseña**).
2. Escriba el correo de su cuenta en **Correo electrónico**.
3. Haga clic en **Enviar el enlace**. La página confirma que el enlace va en camino.
4. Abra el correo **Restablecer su contraseña** y haga clic en **Elegir una nueva contraseña**. Revise la carpeta de spam si no está en la bandeja de entrada.
5. Escriba su nueva contraseña dos veces (al menos 8 caracteres): **Nueva contraseña** y **Confirmar la nueva contraseña**.
6. Haga clic en **Guardar la nueva contraseña** y luego en **Iniciar sesión** con la nueva contraseña.

![Elegir la nueva contraseña](shot:auth-reset-password)

## Bueno saber

- El enlace funciona **una sola vez** y caduca a los **30 minutos**. Una nueva solicitud reemplaza el enlace anterior.
- El correo está escrito en el idioma que mostraba la página cuando lo pidió.
- Por seguridad, la página muestra el mismo mensaje tenga o no cuenta la dirección.
- Guardar la nueva contraseña **cierra la sesión en todos los dispositivos** conectados a su cuenta y desbloquea una cuenta bloqueada tras demasiados intentos.
- Si la autenticación de dos factores está activada, la aplicación sigue pidiendo su código de 6 dígitos al iniciar sesión.
- Como máximo 3 enlaces por hora para una misma cuenta.

## Mensajes de error

- **Este enlace no es válido o ha caducado. Pida uno nuevo.**: el enlace ya se usó, tiene más de 30 minutos o fue reemplazado por uno más reciente. Haga clic en **Pedir un nuevo enlace**.
- **Las dos contraseñas son diferentes**: escriba la misma contraseña en los dos campos.

> **Consejo:** ¿ningún correo después de unos minutos? Revise la dirección que escribió. Un responsable también puede asignarle una nueva contraseña en **Usuarios** (vea [Restablecer la contraseña](topic:users-manage)).
