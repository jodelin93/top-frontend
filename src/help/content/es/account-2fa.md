---
id: account-2fa
title: Activar la autenticación de dos factores (2FA)
category: Mi cuenta
order: 1502
routes: [/account/security]
keywords: [autenticación de dos factores, doble autenticación, 2FA, verificación en dos pasos, código QR, authenticator, código de 6 dígitos, activar, desactivar, cambiar de teléfono, celular]
related: [auth-mfa, settings-security, account-security]
---
La autenticación de dos factores agrega un código de 6 dígitos, que muestra una aplicación en su teléfono. Aunque alguien le robe la contraseña, no podrá iniciar sesión sin su teléfono.

Primero instale una aplicación de autenticación: por ejemplo, Google Authenticator, Microsoft Authenticator o 1Password.

1. En **Seguridad de la cuenta**, sección **Autenticación de dos factores**, haga clic en **Activar**.
2. Abra la aplicación en su teléfono y escanee el código QR que aparece.
3. Si no puede escanearlo, escriba en la aplicación la clave que aparece debajo de **¿No puede escanear? Ingrese esta clave manualmente**.
4. Escriba el código de 6 dígitos que muestra la aplicación.
5. Haga clic en **Verificar y activar**.

El **Estado** cambia a **Activado**. Cada vez que inicie sesión, se le pedirá el código después de la contraseña (vea [Ingresar el código](topic:auth-mfa)).

> **Atención:** nunca muestre el código QR ni la clave a otra persona, y no les tome fotos.

> **Consejo:** para abandonar antes de terminar, haga clic en **Cancelar**: nada se activa antes de **Verificar y activar**.

Para desactivarla, haga clic en **Desactivar** y escriba un código actual de la aplicación. Para cambiar de teléfono, desactívela con el teléfono anterior y luego actívela con el nuevo.

> **Atención:** si la tienda exige la autenticación de dos factores a los administradores (vea [Sin conexión y seguridad](topic:settings-security)), las personas afectadas llegan a esta página al iniciar sesión, con el mensaje **La autenticación de dos factores es obligatoria**, y deben activarla antes de cualquier otra acción.
