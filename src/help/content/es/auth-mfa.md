---
id: auth-mfa
title: Ingresar el código de autenticación de dos factores
category: Primeros pasos
order: 102
public: true
routes: [/auth/mfa-verify]
keywords: [autenticación de dos factores, doble autenticación, 2FA, verificación en dos pasos, código, verificación, authenticator, teléfono, celular, 6 dígitos]
related: [account-2fa, auth-login, faq-account]
---
La autenticación de dos factores protege una cuenta con un código de 6 dígitos. Este código cambia cada 30 segundos en una aplicación del teléfono (Google Authenticator, Microsoft Authenticator, 1Password…).

Si está activada en su cuenta, la pantalla **Autenticación de dos factores** aparece después de la contraseña:

1. Abra la aplicación de autenticación en su teléfono.
2. Lea el código de 6 dígitos que aparece para su cuenta.
3. Escríbalo en el campo **Código de verificación**.
4. Haga clic en **Verificar**.
5. Si hay algún problema, haga clic en **Volver al inicio de sesión** para empezar de nuevo.

> **Consejo:** si aparece el mensaje **Código de verificación no válido**, compruebe que la hora del teléfono sea correcta: un teléfono atrasado genera códigos incorrectos. Un mismo código sirve una sola vez: espere el siguiente si acaba de usarlo.

> **Atención:** los códigos incorrectos cuentan como intentos de inicio de sesión. Después de 5 errores seguidos, la cuenta queda bloqueada 15 minutos.

La tienda puede exigir la autenticación de dos factores a las personas que gestionan los usuarios, los roles, la configuración o el registro de auditoría. En ese caso, la aplicación lo lleva a **Seguridad de la cuenta** para activarla antes de cualquier otra acción (vea [Activar la autenticación de dos factores](topic:account-2fa)).
